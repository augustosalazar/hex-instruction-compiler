import type { InstructionFormat } from "../../types/isa";

export const R_TYPE: InstructionFormat = {
    fields: {
        opcode: { offset: 26, size: 6 },
        rs: { offset: 21, size: 5 },
        rt: { offset: 16, size: 5 },
        rd: { offset: 11, size: 5 },
        shamt: { offset: 6, size: 5 },
        funct: { offset: 0, size: 6 }
    },
    mapFields: (f) => ({ type: "R", operand1: f.rs ?? 0, operand2: f.rt ?? 0, target: f.rd ?? 0 })
}

export const I_TYPE: InstructionFormat = {
    fields: {
        opcode: { offset: 26, size: 6 },
        rs: { offset: 21, size: 5 },
        rt: { offset: 16, size: 5 },
        immediate: { offset: 0, size: 16 }
    },
    mapFields: (f) => ({ type: "I", operand1: f.rs ?? 0, operand2: f.immediate ?? 0, target: f.rt ?? 0 })
}

export const J_TYPE: InstructionFormat = {
    fields: {
        opcode: { offset: 26, size: 6 },
        immediate: { offset: 0, size: 26 }
    },
    mapFields: (f) => ({ type: "J", operand1: f.immediate ?? 0, operand2: 0, target: 0 })
}