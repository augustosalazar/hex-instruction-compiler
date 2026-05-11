export default interface InstructionReturn {
    status: string //success or failure maybe?
}

export interface RTypeReturn extends InstructionReturn {
    targetRegister: string,
    result: number
}