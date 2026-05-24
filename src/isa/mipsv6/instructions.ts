import type { InstructionDefinition } from "../../types/isa";
import { R_TYPE, I_TYPE, J_TYPE } from "./formats";

// ─── R-type instructions ──────────────────────────────────────────────────────

export const ADD: InstructionDefinition = {
    semantic: "ADD",
    format: R_TYPE,
    pattern: {
        opcode: 0,
        funct: 32,
    },
};

export const ADDU: InstructionDefinition = {
    semantic: "ADDU",
    format: R_TYPE,
    pattern: {
        opcode: 0,
        funct: 33,
    },
};

export const SUB: InstructionDefinition = {
    semantic: "SUB",
    format: R_TYPE,
    pattern: {
        opcode: 0,
        funct: 34,
    },
};

export const SUBU: InstructionDefinition = {
    semantic: "SUBU",
    format: R_TYPE,
    pattern: {
        opcode: 0,
        funct: 35,
    },
};

// SPEC 6 — funct = 26 (011010), disambiguated by shamt
export const DIV: InstructionDefinition = {
    semantic: "DIV",
    format: R_TYPE,
    pattern: {
        opcode: 0,
        funct: 26,
        shamt: 2,
    },
};

export const MOD: InstructionDefinition = {
    semantic: "MOD",
    format: R_TYPE,
    pattern: {
        opcode: 0,
        funct: 26,
        shamt: 3,
    },
};

// SPEC 6 — funct = 27 (011011), disambiguated by shamt
export const DIVU: InstructionDefinition = {
    semantic: "DIVU",
    format: R_TYPE,
    pattern: {
        opcode: 0,
        funct: 27,
        shamt: 2,
    },
};

export const MODU: InstructionDefinition = {
    semantic: "MODU",
    format: R_TYPE,
    pattern: {
        opcode: 0,
        funct: 27,
        shamt: 3,
    },
};

// SPEC 6 — funct = 24 (011000), disambiguated by shamt
export const MUL: InstructionDefinition = {
    semantic: "MUL",
    format: R_TYPE,
    pattern: {
        opcode: 0,
        funct: 24,
        shamt: 2,
    },
};

export const MUH: InstructionDefinition = {
    semantic: "MUH",
    format: R_TYPE,
    pattern: {
        opcode: 0,
        funct: 24,
        shamt: 3,
    },
};

// SPEC 6 — funct = 25 (011001), disambiguated by shamt
export const MULU: InstructionDefinition = {
    semantic: "MULU",
    format: R_TYPE,
    pattern: {
        opcode: 0,
        funct: 25,
        shamt: 2,
    },
};

export const MUHU: InstructionDefinition = {
    semantic: "MUHU",
    format: R_TYPE,
    pattern: {
        opcode: 0,
        funct: 25,
        shamt: 3,
    },
};

export const NOR: InstructionDefinition = {
    semantic: "NOR",
    format: R_TYPE,
    pattern: {
        opcode: 0,
        funct: 39,
    },
};

export const XOR: InstructionDefinition = {
    semantic: "XOR",
    format: R_TYPE,
    pattern: {
        opcode: 0,
        funct: 38,
    },
};

export const AND: InstructionDefinition = {
    semantic: "AND",
    format: R_TYPE,
    pattern: {
        opcode: 0,
        funct: 36,
    },
};

export const OR: InstructionDefinition = {
    semantic: "OR",
    format: R_TYPE,
    pattern: {
        opcode: 0,
        funct: 37,
    },
};

export const SLT: InstructionDefinition = {
    semantic: "SLT",
    format: R_TYPE,
    pattern: {
        opcode: 0,
        funct: 42,
    },
};

export const NOP: InstructionDefinition = {
    semantic: "NOP",
    format: R_TYPE,
    pattern: {
        opcode: 0,
        funct: 0,
        shamt: 0,
    },
};

// ─── I-type instructions ──────────────────────────────────────────────────────

export const LW: InstructionDefinition = {
    semantic: "LW",
    format: I_TYPE,
    pattern: {
        opcode: 35,
    },
};

export const SW: InstructionDefinition = {
    semantic: "SW",
    format: I_TYPE,
    pattern: {
        opcode: 43,
    },
};

export const ADDIU: InstructionDefinition = {
    semantic: "ADDIU",
    format: I_TYPE,
    pattern: {
        opcode: 9,
    },
};

export const ANDI: InstructionDefinition = {
    semantic: "ANDI",
    format: I_TYPE,
    pattern: {
        opcode: 12,
    },
};

export const ORI: InstructionDefinition = {
    semantic: "ORI",
    format: I_TYPE,
    pattern: {
        opcode: 13,
    },
};

export const XORI: InstructionDefinition = {
    semantic: "XORI",
    format: I_TYPE,
    pattern: {
        opcode: 14,
    },
};

export const SLTI: InstructionDefinition = {
    semantic: "SLTI",
    format: I_TYPE,
    pattern: {
        opcode: 10,
    },
};

export const SLTIU: InstructionDefinition = {
    semantic: "SLTIU",
    format: I_TYPE,
    pattern: {
        opcode: 11,
    },
};

// Branch instructions
export const BEQ: InstructionDefinition = {
    semantic: "BEQ",
    format: I_TYPE,
    pattern: {
        opcode: 4,
    },
};

export const BNE: InstructionDefinition = {
    semantic: "BNE",
    format: I_TYPE,
    pattern: {
        opcode: 5,
    },
};

export const BLTZ: InstructionDefinition = {
    semantic: "BLTZ",
    format: I_TYPE,
    pattern: {
        opcode: 1,
    },
};

export const BLEZALC: InstructionDefinition = {
    semantic: "BLEZALC",
    format: I_TYPE,
    pattern: {
        opcode: 6,
    },
};

export const BGTZALC: InstructionDefinition = {
    semantic: "BGTZALC",
    format: I_TYPE,
    pattern: {
        opcode: 7,
    },
};

export const BEQZALC: InstructionDefinition = {
    semantic: "BEQZALC",
    format: I_TYPE,
    pattern: {
        opcode: 8,
    },
};

export const BNEZALC: InstructionDefinition = {
    semantic: "BNEZALC",
    format: I_TYPE,
    pattern: {
        opcode: 24,
    },
};

export const BLEZC: InstructionDefinition = {
    semantic: "BLEZC",
    format: I_TYPE,
    pattern: {
        opcode: 22,
    },
};

export const BGTZC: InstructionDefinition = {
    semantic: "BGTZC",
    format: I_TYPE,
    pattern: {
        opcode: 23,
    },
};

// ─── J-type instructions ──────────────────────────────────────────────────────

export const J: InstructionDefinition = {
    semantic: "J",
    format: J_TYPE,
    pattern: {
        opcode: 2,
    },
};

export const JAL: InstructionDefinition = {
    semantic: "JAL",
    format: J_TYPE,
    pattern: {
        opcode: 3,
    },
};

export const BC: InstructionDefinition = {
    semantic: "BC",
    format: J_TYPE,
    pattern: {
        opcode: 50,
    },
};

export const BALC: InstructionDefinition = {
    semantic: "BALC",
    format: J_TYPE,
    pattern: {
        opcode: 58,
    },
};