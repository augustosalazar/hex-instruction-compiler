export interface InstructionFormat {
    fields: {
        opcode: { offset: number, size: number };
        rs?: { offset: number, size: number };
        rt?: { offset: number, size: number };
        rd?: { offset: number, size: number };
        shamt?: { offset: number, size: number };
        funct?: { offset: number, size: number };
        immediate?: { offset: number, size: number };
    };
    mapFields: (f: Record<string, number>) => { type: string, operand1: number, operand2: number, target: number };
}