import type RegisterUnit from './RegisterUnit';
import type InstructionReturn from './InstructionReturn';
import type Program from './Program';
import type Instruction from './Program';
import type { ExecuteOutput, MemoryHandleOutput, RegWriteOutput } from './StepResults';
import MemoryUnit from './MemoryUnit';

// compiler interface.
// describes the minimal methods and attributes a compiler needs to be used by the central 'compile' function.
// the idea is that every Compiler has each step executed at the rate the 'compile' function needs.
// This is so that singleCycle, pipelined and pipelinedProtected do whatever they deem fit with each stage
// also, 'instructionCycle' just calls each and every step in the order the arquitecture needs.

// The 'compile' function provides the register unit and the PC to the Compiler so that
// it knows which Instruction to execute and the values in the operand registers.
// in turn, the Compiler is to return any sort of InstructionReturn, which tells the 'compile' function
// what the result is and what to do with it.

export default interface Compiler {
    program: Program; //Memoria de instrucciones

    //Se dice que cada Compilador sabe:
    decodeWord(programCounter: number): Instruction; //1. 'Leer' o Decodificar cada palabra del Programa
    executeInstruction(decodedWord: Instruction, registerUnit: RegisterUnit): ExecuteOutput; //2. Ejecutar la palabra decodificada
    memoryHandle(address: ExecuteOutput, memoryUnit: MemoryUnit): MemoryHandleOutput;//3. Guardar o Sacar de memoria
    registerWriteFromMem(data: MemoryHandleOutput, registerUnit: RegisterUnit): RegWriteOutput;//4.a. Escribir a registro algo de memoria
    registerWriteFromExec(data: ExecuteOutput, registerUnit: RegisterUnit): RegWriteOutput;// 4.b. Escribir a registro algo de exec
    //Se asume que registerWrite sería lo último en ejecutarse en un ciclo completo de ejecución

    // Esta funcion debería ejecutar las funciones de arriba con la secuencia/logica especifica a la arquitectura
    instructionCycle(registerUnit: RegisterUnit, programCounter: number,): InstructionReturn;
}