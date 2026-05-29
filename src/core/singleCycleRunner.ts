import type { Processor, CompileOutput, ExecutionContext, Program } from "../types/abstracts";
import { singleCycle } from "./singleCycle";

// correr el Programa de manera secuencial
export function singleCycleRun(
    processor: Processor,
    program: Program,
    ctx: ExecutionContext
): CompileOutput {
    let cycles = 0;
    const start = performance.now();

    while (ctx.pc < program.instructions.length) {

        //A single cycle just performs every Step in succession.
        singleCycle(processor, program, ctx);

        cycles++;
    }

    const end = performance.now();

    return {
        registryState: ctx.registers,
        time: end - start,
        cycles: cycles,
    }
}
