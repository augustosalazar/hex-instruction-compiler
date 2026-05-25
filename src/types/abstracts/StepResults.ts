export interface ExecuteOutput {
    aluResult: number;
    targetRegister?: number; // Undefined for branches/jumps where no register is written
}

export interface MemoryOutput {
    valueToWrite: number;
    targetRegister?: number;
}

export interface MemoryOperationExecuteOutput extends ExecuteOutput {
    storeValue?: number;
    isLoad?: boolean;
}