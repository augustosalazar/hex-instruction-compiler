import { InstructionFormat } from "./instruction-format.interface";

export interface InstructionDefinition {
    semantic: string;
    format: InstructionFormat;
    pattern: {
        opcode: number;
        funct?: number;
        shamt?: number;
    }
}