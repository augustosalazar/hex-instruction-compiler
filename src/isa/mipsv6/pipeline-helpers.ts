// ─── MIPS v6 Pipeline Helpers ─────────────────────────────────────────────────
// ISA-specific implementations of the Processor pipeline-support contract.
// These are the single source of truth for "which registers does this MIPS
// instruction touch" and "what is a MIPS NOP", replacing the ad-hoc logic
// that previously lived in types/abstracts/StageContext.ts.

import type { Instruction } from "../../types/abstracts";

// ─── MIPS NOP Instruction ─────────────────────────────────────────────────────

export const MIPS_NOP: Instruction = {
    type: "R",
    op: "NOP",
    operand1: 0,
    operand2: 0,
    target: 0,
};

// ─── Branch opcodes that never write a destination register ───────────────────

const BRANCH_NO_WRITE = new Set([
    "BEQ", "BNE", "BLTZ",
    "BLEZALC", "BGTZALC", "BEQZALC", "BNEZALC",
    "BLEZC", "BGTZC",
]);

// ─── Register analysis helpers ────────────────────────────────────────────────

/**
 * Returns the source register indices that a MIPS decoded instruction reads.
 * Used by the hazard unit to detect RAW dependencies.
 */
export function mipsGetReadRegisters(decoded: Instruction): number[] {
    if (decoded.op === "NOP") return [];

    const reads: number[] = [];

    if (decoded.type === "R") {
        // R-type: reads operand1 (rs) and operand2 (rt)
        reads.push(decoded.operand1, decoded.operand2);
    } else if (decoded.type === "I") {
        // I-type: always reads operand1 (rs)
        reads.push(decoded.operand1);

        // SW reads rt (target) as the value to store
        if (decoded.op === "SW") reads.push(decoded.target);

        // BEQ/BNE read both rs and rt for comparison
        if (decoded.op === "BEQ" || decoded.op === "BNE") reads.push(decoded.target);
    }
    // J-type: no register reads

    return reads;
}

/**
 * Returns the destination register index that a MIPS decoded instruction writes,
 * or undefined if the instruction does not write to any register.
 */
export function mipsGetWriteRegister(decoded: Instruction): number | undefined {
    if (decoded.op === "NOP") return undefined;
    if (decoded.op === "SW") return undefined;
    if (decoded.type === "J" || decoded.op === "BC") return undefined;
    if (BRANCH_NO_WRITE.has(decoded.op)) return undefined;

    return decoded.target !== 0 ? decoded.target : undefined;
}

/**
 * Returns true if the instruction is a MIPS load (LW).
 * Load instructions have a 1-cycle latency before their result is available,
 * requiring a stall when the next instruction reads the loaded register.
 */
export function mipsIsLoadInstruction(decoded: Instruction): boolean {
    return decoded.op === "LW";
}
