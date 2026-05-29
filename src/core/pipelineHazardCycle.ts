import type {
    Processor,
    Program,
    ExecutionContext,
    IFStageContext,
    IDStageContext,
    EXStageContext,
    MEMStageContext,
    PipelineCycleSnapshot,
} from "../types/abstracts";
import { bubbleIF, bubbleID, bubbleEX, bubbleMEM } from "../types/abstracts";

// ─── Hazard Pipeline State ────────────────────────────────────────────────────
// Extends the basic latch state with the extra bookkeeping needed for hazard
// detection and resolution: the runner-owned PC (decoupled from ctx.pc which
// MIPSv6Processor.fetch() would mutate), and the stall flag carried between ticks.

export interface HazardPipelineState {
    ifLatch: IFStageContext;
    idLatch: IDStageContext;
    exLatch: EXStageContext;
    memLatch: MEMStageContext;
    fetchDone: boolean;
    /** Runner-owned program counter, independent of ctx.pc */
    nextPC: number;
    /** True when the previous tick requested a stall for this cycle */
    stallCycle: boolean;
}

export function initHazardPipelineState(processor: Processor): HazardPipelineState {
    const nop = processor.nopInstruction();
    return {
        ifLatch: bubbleIF(),
        idLatch: bubbleID(nop),
        exLatch: bubbleEX(nop),
        memLatch: bubbleMEM(nop),
        fetchDone: false,
        nextPC: 0,
        stallCycle: false,
    };
}

// ─── One tick of the hazard-aware pipeline ────────────────────────────────────
//
// Handles forwarding (EX/MEM→EX), load-use stalls, and control hazards
// (branch/jump flush with optional delay slot).
//
// ISA knowledge is fully delegated to the Processor:
//   - processor.getReadRegisters / getWriteRegister / isLoadInstruction
//     drive hazard detection without any opcode string comparisons here.
//   - processor.execute(dec, ctx, forwarded, effectivePC) applies forwarding
//     and branch-PC correction internally.
//
// The runner manages only pipeline infrastructure: latch freeze/flush,
// forwarding-map construction from latch data, and PC steering.

export function pipelineHazardCycle(
    processor: Processor,
    program: Program,
    ctx: ExecutionContext,
    state: HazardPipelineState,
    cycleNum: number,
): { next: HazardPipelineState; snapshot: PipelineCycleSnapshot } {

    const { ifLatch, idLatch, exLatch, memLatch, stallCycle } = state;
    const nop = processor.nopInstruction();
    let { nextPC, fetchDone } = state;

    // ── WB ───────────────────────────────────────────────────────────────────
    if (memLatch.valid) processor.writeback(memLatch.memResult, ctx);

    // ── MEM ──────────────────────────────────────────────────────────────────
    let nextMEM: MEMStageContext = bubbleMEM(nop);
    if (exLatch.valid) {
        const memResult = processor.memoryAccess(exLatch.execResult, ctx);
        nextMEM = {
            valid: true,
            decoded: exLatch.decoded,
            memResult,
            pc: exLatch.pc,
            forwardingValue: memResult.valueToWrite,
            writesRegister: exLatch.writesRegister,
        };
    }

    // ── EX (with forwarding) ─────────────────────────────────────────────────
    let nextEX: EXStageContext = bubbleEX(nop);

    if (!stallCycle && idLatch.valid) {
        const dec = idLatch.decoded;
        const readsRegs = idLatch.readsRegisters;

        // Build the forwarding map from current latch data.
        // EX-stage forwarding wins over MEM-stage (written last, read first).
        const forwarded = new Map<number, number>();

        if (memLatch.valid && memLatch.writesRegister !== undefined) {
            for (const r of readsRegs) {
                if (r === memLatch.writesRegister) forwarded.set(r, memLatch.forwardingValue);
            }
        }

        if (exLatch.valid && exLatch.writesRegister !== undefined) {
            for (const r of readsRegs) {
                if (r === exLatch.writesRegister) forwarded.set(r, exLatch.forwardingValue);
            }
        }

        // effectivePC: the PC a branch instruction should use for its target
        // calculation (instruction address + 1, i.e. "PC+4" in MIPS convention).
        // The processor handles this internally; the runner just supplies the value.
        const effectivePC = idLatch.pc + 1;
        const execResult = processor.execute(dec, ctx, forwarded, effectivePC);

        nextEX = {
            valid: true,
            decoded: dec,
            execResult,
            pc: idLatch.pc,
            forwardingValue: execResult.aluResult,
            writesRegister: processor.getWriteRegister(dec),
            isLoad: processor.isLoadInstruction(dec),
        };
    }

    // ── ID ───────────────────────────────────────────────────────────────────
    let nextID: IDStageContext = bubbleID(nop);

    if (!stallCycle && ifLatch.valid) {
        const decoded = processor.decode(ifLatch.word, ctx);
        nextID = {
            valid: true,
            decoded,
            pc: ifLatch.pc,
            readsRegisters: processor.getReadRegisters(decoded),
            writesRegister: processor.getWriteRegister(decoded),
            isLoad: processor.isLoadInstruction(decoded),
        };
    } else if (stallCycle) {
        nextID = idLatch; // freeze
    }

    // ── IF ───────────────────────────────────────────────────────────────────
    // Hazard runner manages its own nextPC, decoupled from MIPSv6Processor.fetch()
    // side-effects, so it can stall/redirect the fetch independently.
    let nextIF: IFStageContext = bubbleIF();

    if (stallCycle) {
        nextIF = ifLatch; // freeze
    } else if (!fetchDone && nextPC < program.instructions.length) {
        const pcAtFetch = nextPC;
        nextIF = {
            valid: true,
            word: program.instructions[nextPC]!,
            pc: pcAtFetch,
        };
        nextPC += 1;
        ctx.pc = nextPC;
    } else {
        fetchDone = true;
    }

    // ── Hazard Detection (decides what happens on the NEXT tick) ─────────────

    let nextStall = false;
    let flushIF = false;
    let flushID = false;

    // Load-use hazard: if the instruction in EX is a load and the instruction
    // entering ID reads the same register, insert one stall bubble.
    // readsRegisters was populated by the processor's getReadRegisters(), so no
    // ISA-specific opcode comparisons are needed here.
    if (nextEX.valid && nextEX.isLoad) {
        const loadDest = nextEX.writesRegister;
        if (loadDest !== undefined && nextID.valid) {
            if (nextID.readsRegisters.includes(loadDest)) {
                nextStall = true;
            }
        }
    }

    // Control hazard: branch/jump resolved in EX — flush speculatively fetched
    // instructions. The processor communicates the jump target via execResult.
    if (!nextStall && nextEX.valid && nextEX.execResult.hasJump) {
        const targetAddr = nextEX.execResult.aluResult;
        const hasDelay = nextEX.execResult.hasDelay ?? false;

        if (hasDelay) {
            // Delay-slot branch: let the instruction already in IF execute (delay slot),
            // but discard whatever would have been fetched next.
            flushIF = true;
            nextPC = targetAddr;
            ctx.pc = nextPC;
        } else {
            // Compact branch / jump: flush both IF and ID.
            flushIF = true;
            flushID = true;
            nextPC = targetAddr;
            ctx.pc = nextPC;
        }
    }

    if (flushIF) {
        nextIF = bubbleIF();
        fetchDone = false;
    }
    if (flushID) nextID = bubbleID(nop);

    const snapshot: PipelineCycleSnapshot = {
        cycle: cycleNum,
        ifStage: nextIF,
        idStage: nextID,
        exStage: nextEX,
        memStage: nextMEM,
        wbStage: memLatch,
        stall: nextStall,
        flush: flushIF || flushID,
    };

    return {
        next: {
            ifLatch: nextIF,
            idLatch: nextID,
            exLatch: nextEX,
            memLatch: nextMEM,
            fetchDone,
            nextPC,
            stallCycle: nextStall,
        },
        snapshot,
    };
}
