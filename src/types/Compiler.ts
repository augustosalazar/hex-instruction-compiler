import type RegisterUnit from '../types/RegisterUnit';
import type InstructionReturn from './InstructionReturn';
import type Program from './Program';

// compiler interface.
// describes the minimal methods and attributes a compiler needs to be used by the central 'compile' function.
// the idea is that every Compiler have its readInstruction() function called at the rate that
// the 'compile' function needs.

// The 'compile' function provides the register unit and the PC to the Compiler so that
// it knows which instruction to execute and the values in the operand registers.
// in turn, the Compiler is to return any sort of InstructionReturn, which tells the 'compile' function
// what the result is and what to do with it.

export default interface Compiler {
    program: Program;
    readInstruction(registerUnit:RegisterUnit, programCounter:number, ): InstructionReturn; 
}