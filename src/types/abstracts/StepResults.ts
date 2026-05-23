//The return types for each abstract step function in the Compiler class.
interface StepOutput {
    result: number,
    target: number
}

export interface ExecuteOutput extends StepOutput {
}

export interface MemoryHandleOutput extends StepOutput {
}

export interface RegWriteOutput extends StepOutput {
}