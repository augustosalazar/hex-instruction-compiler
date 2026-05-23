import InstructionReturn from "./InstructionReturn";
import type RegisterUnit from "./RegisterUnit";

//the return type for every main 'compile' function. (/core folder)

export default interface CompileOutput {
    registryState: RegisterUnit | null,
    cycles: number | null,
    time: number | null,
    pipelineStates?: InstructionReturn[] //cada columna es una tabla y cada fila es un ciclo de ejecucion
}