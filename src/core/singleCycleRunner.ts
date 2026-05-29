import type { Processor, CompileOutput, ExecutionContext, Program, SingleCycleSnapshot } from "../types/abstracts";
import { singleCycle } from "./singleCycle";

// Runs the program sequentially — one instruction per cycle — and collects a
// per-instruction history, making singleCycleRun consistent with pipelineRun
// and pipelineHazardRun in returning a populated history field in CompileOutput.
export function singleCycleRun(
    processor: Processor,
    program: Program,
    ctx: ExecutionContext,
): CompileOutput {
    let cycles = 0;
    const start = performance.now();
    const history: SingleCycleSnapshot[] = [];

    while (ctx.pc < program.instructions.length) {
        const pc = ctx.pc;
        singleCycle(processor, program, ctx);
        history.push({ cycle: cycles, pc });
        cycles++;
    }

    const end = performance.now();

    return {
        registryState: ctx.registers,
        time: end - start,
        cycles,
        singleCycleStates: history,
    };
}
