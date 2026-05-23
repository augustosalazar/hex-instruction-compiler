// MIPS compiler class. 
//  - every class implements the 'Compiler' class
//    and defines the available operations from the architecture to be implemented.
//  - in other words, every compiler knows how to read in its own terms.

import type Compiler from "../abstracts/Compiler";
import InstructionReturn from "../abstracts/InstructionReturn";
import MemoryUnit from "../abstracts/MemoryUnit";
import Program from "../abstracts/Program";
import RegisterUnit from "../abstracts/RegisterUnit";
import { ExecuteOutput, MemoryHandleOutput, RegWriteOutput } from "../abstracts/StepResults";

export default class MIPSCompiler implements Compiler {

    program: Program;

    constructor(rawProgram: string) {
        this.program = 
    }

    decodeWord(programCounter: number): Program {
        throw new Error("Method not implemented.");
    }

    executeInstruction(decodedWord: Program, registerUnit: RegisterUnit): ExecuteOutput {
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