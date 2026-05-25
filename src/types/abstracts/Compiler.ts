import { InstructionReturn } from './InstructionReturn';
import { Instruction, Program } from './Program';
import { ExecuteOutput, MemoryOutput } from './StepResults';
import { ExecutionContext } from './execution-context.interface';

// compiler interface.
// describes the minimal methods and attributes a compiler needs to be used by the central 'compile' function.
// the idea is that every Compiler has each step executed at the rate the 'compile' function needs.
// This is so that singleCycle, pipelined and pipelinedProtected do whatever they deem fit with each stage
// also, 'instructionCycle' just calls each and every step in the order the arquitecture needs.

// The 'compile' function provides the register unit and the PC to the Compiler so that
// it knows which Instruction to execute and the values in the operand registers.
// in turn, the Compiler is to return any sort of InstructionReturn, which tells the 'compile' function
// what the result is and what to do with it.

export interface Compiler {

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

    // Orchestrator for the cycle
    instructionCycle(program: Program, ctx: ExecutionContext): InstructionReturn;
}