import type { InstructionDefinition } from "@/types/isa";
import { R_TYPE } from "./formats";

const ADD: InstructionDefinition = {
    semantic: "ADD",
    format: R_TYPE,
    pattern: {
        opcode: 0,
        funct: 32
    }
}

export const SUB: InstructionDefinition = {
    semantic: "SUB",
    format: R_TYPE,
    pattern: {
        opcode: 0,
        funct: 34
    }
}

export const AND: InstructionDefinition = {
    semantic: "AND",
    format: R_TYPE,
    pattern: {
        opcode: 0,
        funct: 36
    }
}

export const OR: InstructionDefinition = {
    semantic: "OR",
    format: R_TYPE,
    pattern: {
        opcode: 0,
        funct: 37
    }
}