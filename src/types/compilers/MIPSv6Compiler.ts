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
    ExecutionContext,
    MemoryOperationExecuteOutput,
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
        const exec = execResult as MemoryOperationExecuteOutput;

        if (exec.storeValue !== undefined) {
            ctx.memory.write(exec.aluResult, exec.storeValue);
            return { valueToWrite: 0 };
        }

        if (exec.isLoad) {
            const dato = ctx.memory.read(exec.aluResult);
            const result: MemoryOutput = { valueToWrite: dato };
            if (exec.targetRegister !== undefined) {
                result.targetRegister = exec.targetRegister;
            }
            return result;
        }

        const result: MemoryOutput = { valueToWrite: exec.aluResult };
        if (exec.targetRegister !== undefined) {
            result.targetRegister = exec.targetRegister;
        }
        return result;
    }

    writeback(memResult: MemoryOutput, ctx: ExecutionContext): void {
        if (memResult.targetRegister !== undefined) {
            ctx.registers.write(memResult.targetRegister, memResult.valueToWrite);
        }
    }

    instructionCycle(program: Program, ctx: ExecutionContext): InstructionReturn {
        const word = this.fetch(program, ctx);
        const decoded = this.decode(word, ctx);
        const execResult = this.execute(decoded, ctx);
        const memResult = this.memoryAccess(execResult, ctx);
        this.writeback(memResult, ctx);
        return { status: "OK" };
    }
}