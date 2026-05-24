import type { InstructionFormat } from "../../types/isa";

export const R_TYPE: InstructionFormat = {
    opcode: [31, 26],
    rs: [25, 21],
    rt: [20, 16],
    rd: [15, 11],
    shamt: [10, 6],
    funct: [5, 0]
}

export const I_TYPE: InstructionFormat = {
    opcode: [31, 26],
    rs: [25, 21],
    rt: [20, 16],
    immediate: [15, 0]
}

export const J_TYPE: InstructionFormat = {
    opcode: [31, 26],
    immediate: [25, 0]
}