export interface InstructionFormat {
    opcode: number[];
    rs?: number[];
    rt?: number[];
    rd?: number[];
    shamt?: number[];
    funct?: number[];
    immediate?: number[];
}