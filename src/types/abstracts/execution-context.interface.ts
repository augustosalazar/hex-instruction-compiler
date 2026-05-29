import MemoryUnit from "../../core/hardware/MemoryUnit";
import RegisterUnit from "../../core/hardware/RegisterUnit";

export interface ExecutionContext {
    pc: number;

    memory: MemoryUnit;

    registers: RegisterUnit;

    delayPending?: boolean;

    jumpAddress?: number;
}

export interface PipelineContext extends ExecutionContext {

}