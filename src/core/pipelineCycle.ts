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

// ─── Basic Pipeline State ─────────────────────────────────────────────────────
// Encapsulates the inter-cycle latch state for the basic (no-hazard) pipeline.
// Passed into pipelineCycle and returned as `next` each tick.

export interface BasicPipelineState {
    ifLatch: IFStageContext;
    idLatch: IDStageContext;
    exLatch: EXStageContext;
    memLatch: MEMStageContext;
    fetchDone: boolean;
}

export function initBasicPipelineState(processor: Processor): BasicPipelineState {
    const nop = processor.nopInstruction();
    return {
        ifLatch: bubbleIF(),
        idLatch: bubbleID(nop),
        exLatch: bubbleEX(nop),
        memLatch: bubbleMEM(nop),
        fetchDone: false,
    };
}

// ─── One tick of the basic (no-hazard) pipeline ───────────────────────────────
//
// Runs all 5 stages in parallel for one cycle with no stalls or forwarding.
// Returns the updated latch state and a snapshot for history/visualization.
//
// Mirrors singleCycle() — one tick, no loop — so pipelineRunner can wrap it
// the same way singleCycleRunner wraps singleCycle().

export function pipelineCycle(
    processor: Processor,
    program: Program,
    ctx: ExecutionContext,
    state: BasicPipelineState,
    cycleNum: number,
): { next: BasicPipelineState; snapshot: PipelineCycleSnapshot } {

    const { ifLatch, idLatch, exLatch, memLatch } = state;
    const nop = processor.nopInstruction();
    let { fetchDone } = state;

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

    // ── EX ───────────────────────────────────────────────────────────────────
    let nextEX: EXStageContext = bubbleEX(nop);
    if (idLatch.valid) {
        const execResult = processor.execute(idLatch.decoded, ctx);
        nextEX = {
            valid: true,
            decoded: idLatch.decoded,
            execResult,
            pc: idLatch.pc,
            forwardingValue: execResult.aluResult,
            writesRegister: idLatch.writesRegister,
            isLoad: idLatch.isLoad,
        };
    }

    // ── ID ───────────────────────────────────────────────────────────────────
    let nextID: IDStageContext = bubbleID(nop);
    if (ifLatch.valid) {
        const decoded = processor.decode(ifLatch.word, ctx);
        nextID = {
            valid: true,
            decoded,
            pc: ifLatch.pc,
            readsRegisters: processor.getReadRegisters(decoded),
            writesRegister: processor.getWriteRegister(decoded),
            isLoad: processor.isLoadInstruction(decoded),
        };
    }

    // ── IF ───────────────────────────────────────────────────────────────────
    // The basic pipeline delegates fetch (and PC mutation) to the processor.
    let nextIF: IFStageContext = bubbleIF();
    if (!fetchDone && ctx.pc < program.instructions.length) {
        const pcBeforeFetch = ctx.pc;
        nextIF = {
            valid: true,
            word: processor.fetch(program, ctx),
            pc: pcBeforeFetch,
        };
    } else {
        fetchDone = true;
    }

    const snapshot: PipelineCycleSnapshot = {
        cycle: cycleNum,
        ifStage: nextIF,
        idStage: nextID,
        exStage: nextEX,
        memStage: nextMEM,
        wbStage: memLatch,
        stall: false,
        flush: false,
    };

    return {
        next: { ifLatch: nextIF, idLatch: nextID, exLatch: nextEX, memLatch: nextMEM, fetchDone },
        snapshot,
    };
}
