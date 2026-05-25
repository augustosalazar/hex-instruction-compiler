// MIPS compiler class. 
//  - every class implements the 'Compiler' class
//    and defines the available operations from the architecture to be implemented.
//  - in other words, every compiler knows how to read in its own terms.

import type {
    Compiler,
    InstructionReturn,
    Program,
    ExecuteOutput,
    MemoryOutput,
    Instruction,
    ExecutionContext
} from "../abstracts";

export default class MIPSv6Compiler implements Compiler {

    fetch(program: Program, ctx: ExecutionContext): number {
        throw new Error("Method not implemented.");
    }

    decode(word: number, ctx: ExecutionContext): Instruction {
        throw new Error("Method not implemented.");
    }

    execute(decoded: Instruction, ctx: ExecutionContext): ExecuteOutput {
        throw new Error("Method not implemented.");
    }

    memoryAccess(execResult: ExecuteOutput, ctx: ExecutionContext): MemoryOutput {
        throw new Error("Method not implemented.");
    }

    writeback(memResult: MemoryOutput, ctx: ExecutionContext): void {
        throw new Error("Method not implemented.");
    }

    instructionCycle(program: Program, ctx: ExecutionContext): InstructionReturn {
        throw new Error("Method not implemented.");
    }
}