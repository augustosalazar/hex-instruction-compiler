import { InstructionReturn } from "./InstructionReturn";
import { PipelineCycleSnapshot } from "./StageContext";
import RegisterUnit from "../../core/hardware/RegisterUnit";

//the return type for every main 'compile' function. (/core folder)

export interface CompileOutput {
    registryState: RegisterUnit | null,
    cycles: number | null,
    time: number | null,
    pipelineStates?: InstructionReturn[] | PipelineCycleSnapshot[] //cada columna es una tabla y cada fila es un ciclo de ejecucion
}