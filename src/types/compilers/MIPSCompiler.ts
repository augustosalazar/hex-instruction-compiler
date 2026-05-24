// MIPS compiler class. 
//  - every class implements the 'Compiler' class
//    and defines the available operations from the architecture to be implemented.
//  - in other words, every compiler knows how to read in its own terms.

import type {
    Compiler,
    InstructionReturn,
    MemoryUnit,
    Program,
    RegisterUnit,
    ExecuteOutput,
    MemoryHandleOutput,
    RegWriteOutput,
    Instruction
} from "../abstracts";

export default class MIPSCompiler implements Compiler {

    decodeWord(programCounter: number): Instruction {
        throw new Error("Method not implemented.");
    }

    executeInstruction(decodedWord: Instruction, registerUnit: RegisterUnit): ExecuteOutput {
        throw new Error("Method not implemented.");
    }

    memoryHandle(address: ExecuteOutput, memoryUnit: MemoryUnit): MemoryHandleOutput {
        throw new Error("Method not implemented.");
    }

    registerWriteFromMem(data: MemoryHandleOutput, registerUnit: RegisterUnit): RegWriteOutput {
        throw new Error("Method not implemented.");
    }

    registerWriteFromExec(data: ExecuteOutput, registerUnit: RegisterUnit): RegWriteOutput {
        throw new Error("Method not implemented.");
    }

    instructionCycle(registerUnit: RegisterUnit, programCounter: number): InstructionReturn {
        throw new Error("Method not implemented.");
    }


}