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

// ─── 1. Basic Pipeline (no hazard protection) ─────────────────────────────────
//
// Runs all 5 stages in parallel each cycle with no stalls or forwarding.
// The pipeline drives its own fetch loop independently of ctx.pc, which
// MIPSv6Processor.fetch() mutates as a side-effect. We capture ctx.pc
// BEFORE each fetch so each latch records where its instruction came from.

export function pipelineRun(
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

    let fetchDone = false;
    const history: PipelineCycleSnapshot[] = [];

    while (true) {

        // WB
        if (memStage.valid) processor.writeback(memStage.memResult, ctx);

        // MEM
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

        // EX
        let nextEX: EXStageContext = bubbleEX();
        if (idStage.valid) {
            const execResult = processor.execute(idStage.decoded, ctx) as MemoryOperationExecuteOutput;
            nextEX = {
                valid: true,
                decoded: idStage.decoded,
                execResult,
                pc: idStage.pc,
                forwardingValue: execResult.aluResult,
                writesRegister: idStage.writesRegister,
                isLoad: idStage.isLoad,
            };
        }

        // ID
        let nextID: IDStageContext = bubbleID();
        if (ifStage.valid) {
            const decoded = processor.decode(ifStage.word, ctx);
            nextID = {
                valid: true,
                decoded,
                pc: ifStage.pc,
                readsRegisters: getReadRegisters(decoded),
                writesRegister: getWriteRegister(decoded),
                isLoad: isLoadInstruction(decoded),
            };
        }

        // IF
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

        history.push({
            cycle: cycles,
            ifStage: nextIF,
            idStage: nextID,
            exStage: nextEX,
            memStage: nextMEM,
            wbStage: memStage,
            stall: false,
            flush: false,
        });

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