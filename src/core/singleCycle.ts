import { Processor, Program, ExecutionContext } from "../types/abstracts";

// One full single-cycle execution: IF → ID → EX → MEM → WB for one instruction.
// Called by singleCycleRunner in a loop, exactly as pipelineCycle is called by pipelineRunner.
export function singleCycle(
    processor: Processor,
    program: Program,
    ctx: ExecutionContext,
): void {

    const word = processor.fetch(program, ctx);
    const decoded = processor.decode(word, ctx);
    const execResult = processor.execute(decoded, ctx);
    const memResult = processor.memoryAccess(execResult, ctx);
    processor.writeback(memResult, ctx);
}