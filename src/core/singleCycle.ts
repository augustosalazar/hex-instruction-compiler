import { CompileOutput, ExecutionContext, Processor, Program } from "../types/abstracts";

export function singleCycle(
    processor: Processor,
    program: Program,
    ctx: ExecutionContext
): void {

    const word = processor.fetch(program, ctx);
    const decoded = processor.decode(word, ctx);
    const execResult = processor.execute(decoded, ctx);
    const memResult = processor.memoryAccess(execResult, ctx);
    processor.writeback(memResult, ctx);

    return;
}