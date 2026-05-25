import type { Processor, CompileOutput, ExecutionContext, Program } from "../types/abstracts";

// correr el Programa de manera secuencial
export function singleCycleRun(
    processor: Processor,
    program: Program,
    ctx: ExecutionContext
): CompileOutput {
    let cycles = 0;
    const start = performance.now();

    while (ctx.pc < program.instructions.length) {
        const word = processor.fetch(program, ctx);
        const decoded = processor.decode(word, ctx);
        const execResult = processor.execute(decoded, ctx);
        const memResult = processor.memoryAccess(execResult, ctx);
        processor.writeback(memResult, ctx);
        
        cycles++;
    }

    const end = performance.now();

    return {
        registryState: ctx.registers,
        time: end - start,
        cycles: cycles,
    }
}
