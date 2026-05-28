import type {
    Processor,
    CompileOutput,
    ExecutionContext,
    Program,
    IFStageContext,
    IDStageContext,
    EXStageContext,
    MEMStageContext,
    MemoryOperationExecuteOutput,
    PipelineCycleSnapshot,
} from "../types/abstracts";

import {
    bubbleIF,
    bubbleID,
    bubbleEX,
    bubbleMEM,
    getReadRegisters,
    getWriteRegister,
    isLoadInstruction,
} from "../types/abstracts";

export function pipelineHazardRun(
    processor: Processor,
    program: Program,
    ctx: ExecutionContext
): CompileOutput {

    let cycles = 0;
    const start = performance.now();

    let ifStage: IFStageContext = bubbleIF();
    let idStage: IDStageContext = bubbleID();
    let exStage: EXStageContext = bubbleEX();
    let memStage: MEMStageContext = bubbleMEM();

    let nextPC = 0;
    let fetchDone = false;
    let stallCycle = false;
    const history: PipelineCycleSnapshot[] = [];

    ctx.pc = 0;

    while (true) {
        // ── WB ───────────────────────────────────────────────────────────────
        if (memStage.valid) {
            processor.writeback(memStage.memResult, ctx);
        }

        // ── MEM ──────────────────────────────────────────────────────────────
        let nextMEM: MEMStageContext = bubbleMEM();
        if (exStage.valid) {
            const memResult = processor.memoryAccess(exStage.execResult, ctx);
            nextMEM = {
                valid: true,
                decoded: exStage.decoded,
                memResult,
                pc: exStage.pc,
                forwardingValue: memResult.valueToWrite,
                writesRegister: exStage.writesRegister,
            };
        }

        // ── EX  (with forwarding) ─────────────────────────────────────────────
        let nextEX: EXStageContext = bubbleEX();

        if (!stallCycle && idStage.valid) {
            const dec = idStage.decoded;
            const readsRegs = idStage.readsRegisters;

            const forwarded = new Map<number, number>();

            if (memStage.valid && memStage.writesRegister !== undefined) {
                for (const r of readsRegs) {
                    if (r === memStage.writesRegister) {
                        forwarded.set(r, memStage.forwardingValue);
                    }
                }
            }

            if (exStage.valid && exStage.writesRegister !== undefined) {
                for (const r of readsRegs) {
                    if (r === exStage.writesRegister) {
                        forwarded.set(r, exStage.forwardingValue);
                    }
                }
            }

            const saved = new Map<number, number>();
            for (const [reg, val] of forwarded) {
                saved.set(reg, ctx.registers.read(reg));
                ctx.registers.write(reg, val);
            }

            // Fix the bug with branch target calculation:
            // Branches use ctx.pc to calculate the target relative to "PC+4" (which is pc+1 here).
            // In a pipeline, nextPC is already 2 cycles ahead, so we must temporarily
            // set ctx.pc to the correct value (idStage.pc + 1) for execute().
            const savedPC = ctx.pc;
            ctx.pc = idStage.pc + 1;

            const execResult = processor.execute(dec, ctx) as MemoryOperationExecuteOutput;
            const writeDest = getWriteRegister(dec);

            ctx.pc = savedPC;

            nextEX = {
                valid: true,
                decoded: dec,
                execResult,
                pc: idStage.pc,
                forwardingValue: execResult.aluResult,
                writesRegister: writeDest,
                isLoad: isLoadInstruction(dec),
            };

            for (const [reg, val] of saved) {
                ctx.registers.write(reg, val);
            }
        }

        // ── ID ───────────────────────────────────────────────────────────────
        let nextID: IDStageContext = bubbleID();

        if (!stallCycle && ifStage.valid) {
            const decoded = processor.decode(ifStage.word, ctx);
            nextID = {
                valid: true,
                decoded,
                pc: ifStage.pc,
                readsRegisters: getReadRegisters(decoded),
                writesRegister: getWriteRegister(decoded),
                isLoad: isLoadInstruction(decoded),
            };
        } else if (stallCycle) {
            nextID = idStage; // freeze
        }

        // ── IF ───────────────────────────────────────────────────────────────
        let nextIF: IFStageContext = bubbleIF();

        if (stallCycle) {
            nextIF = ifStage; // freeze
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

        // ── Hazard Detection (decides what happens on the NEXT cycle) ─────────
        stallCycle = false;
        let flushIF = false;
        let flushID = false;

        if (nextEX.valid && nextEX.isLoad) {
            const loadDest = nextEX.writesRegister;
            if (loadDest !== undefined && nextID.valid) {
                const d = nextID.decoded;
                const uses = [d.operand1];
                if (d.type === "R" || d.op === "SW" || d.op === "BEQ" || d.op === "BNE") {
                    uses.push(d.operand2 ?? -1);
                }
                if (d.op === "SW" || d.op === "BEQ" || d.op === "BNE") {
                    uses.push(d.target);
                }
                if (uses.includes(loadDest)) {
                    stallCycle = true;
                }
            }
        }

        if (!stallCycle && nextEX.valid && nextEX.execResult.hasJump) {
            const targetAddr = nextEX.execResult.aluResult;
            const hasDelay = nextEX.execResult.hasDelay ?? false;

            if (hasDelay) {
                flushIF = true;
                nextPC = targetAddr;
                ctx.pc = nextPC;
            } else {
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
        if (flushID) nextID = bubbleID();

        history.push({
            cycle: cycles,
            ifStage: nextIF,
            idStage: nextID,
            exStage: nextEX,
            memStage: nextMEM,
            wbStage: memStage,
            stall: stallCycle,
            flush: flushIF || flushID,
        });

        // ── Advance latches ───────────────────────────────────────────────────
        memStage = nextMEM;
        exStage = nextEX;
        idStage = nextID;
        ifStage = nextIF;

        cycles++;
        if (fetchDone && !ifStage.valid && !idStage.valid && !exStage.valid && !memStage.valid) break;
    }

    const end = performance.now();
    return { registryState: ctx.registers, time: end - start, cycles, pipelineStates: history };
}