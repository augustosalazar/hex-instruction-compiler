import { InstructionReturn } from './InstructionReturn';
import { Instruction, Program } from './Program';
import { ExecuteOutput, MemoryOutput } from './StepResults';
import { ExecutionContext } from './execution-context.interface';

// processor interface.
// describes the minimal methods and attributes a processor needs to be used by runners.
// the idea is that every Processor has each step executed at the rate the runner function needs.
// This is so that singleCycle, pipelined and pipelinedProtected do whatever they deem fit with each stage

// The runner provides the register unit and the PC to the Processor so that
// it knows which Instruction to execute and the values in the operand registers.

export interface Processor {

    // 1. IF (Instruction Fetch)
    fetch(program: Program, ctx: ExecutionContext): number;

    // 2. ID (Instruction Decode)
    decode(word: number, ctx: ExecutionContext): Instruction;

    // 3. EX (Execute)
    execute(decoded: Instruction, ctx: ExecutionContext): ExecuteOutput;

    // 4. MEM (Memory Access)
    memoryAccess(execResult: ExecuteOutput, ctx: ExecutionContext): MemoryOutput;

    // 5. WB (Write Back)
    writeback(memResult: MemoryOutput, ctx: ExecutionContext): void;
}