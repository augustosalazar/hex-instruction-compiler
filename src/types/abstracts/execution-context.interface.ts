import MemoryUnit from "./MemoryUnit";
import RegisterUnit from "./RegisterUnit";

export interface ExecutionContext {
    pc: number;

    memory: MemoryUnit;

    registers: RegisterUnit;
}

export interface PipelineContext extends ExecutionContext {

}