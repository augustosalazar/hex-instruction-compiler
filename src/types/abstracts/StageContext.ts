import type { Instruction } from './Program';
import type { MemoryOperationExecuteOutput, MemoryOutput } from './StepResults';

// ─── Stage Context Interfaces ─────────────────────────────────────────────────
// Each pipeline stage produces a typed context that explicitly declares
// which registers are read/written, enabling clean hazard detection and
// allowing library consumers to introspect pipeline state.

export interface StageContextBase {
    valid: boolean;
    pc: number;
}

/** IF → ID latch: carries the fetched word and its PC */
export interface IFStageContext extends StageContextBase {
    word: number;
}

/** ID → EX latch: carries decoded instruction + register metadata */
export interface IDStageContext extends StageContextBase {
    decoded: Instruction;
    /** Source registers this instruction reads during EX */
    readsRegisters: number[];
    /** Destination register this instruction writes (undefined if none) */
    writesRegister: number | undefined;
    /** Whether this is a load instruction (for load-use hazard detection) */
    isLoad: boolean;
}

/** EX → MEM latch: carries execution result + forwarding info */
export interface EXStageContext extends StageContextBase {
    decoded: Instruction;
    execResult: MemoryOperationExecuteOutput;
    /** Value available for forwarding from EX stage */
    forwardingValue: number;
    /** Destination register */
    writesRegister: number | undefined;
    /** Whether this is a load (real value comes from MEM, not forwardingValue) */
    isLoad: boolean;
}

/** MEM → WB latch: carries memory result + forwarding info */
export interface MEMStageContext extends StageContextBase {
    decoded: Instruction;
    memResult: MemoryOutput;
    /** Value available for forwarding from MEM stage */
    forwardingValue: number;
    /** Destination register */
    writesRegister: number | undefined;
}

/** Pipeline cycle snapshot for introspection/visualization */
export interface PipelineCycleSnapshot {
    cycle: number;
    ifStage: IFStageContext;
    idStage: IDStageContext;
    exStage: EXStageContext;
    memStage: MEMStageContext;
    wbStage: MEMStageContext; // WB consumes MEMStageContext
    stall: boolean;
    flush: boolean;
}

// ─── NOP Instruction constant ─────────────────────────────────────────────────

const NOP_INSTRUCTION: Instruction = {
    type: "R",
    op: "NOP",
    operand1: 0,
    operand2: 0,
    target: 0,
};

// ─── Bubble Factories ─────────────────────────────────────────────────────────
// Create "empty" stage contexts (bubbles/NOPs) for pipeline initialization
// and flush/stall insertion.

export function bubbleIF(): IFStageContext {
    return { valid: false, word: 0, pc: 0 };
}

export function bubbleID(): IDStageContext {
    return {
        valid: false,
        decoded: NOP_INSTRUCTION,
        pc: 0,
        readsRegisters: [],
        writesRegister: undefined,
        isLoad: false,
    };
}

export function bubbleEX(): EXStageContext {
    return {
        valid: false,
        decoded: NOP_INSTRUCTION,
        execResult: { aluResult: 0 },
        pc: 0,
        forwardingValue: 0,
        writesRegister: undefined,
        isLoad: false,
    };
}

export function bubbleMEM(): MEMStageContext {
    return {
        valid: false,
        decoded: NOP_INSTRUCTION,
        memResult: { valueToWrite: 0 },
        pc: 0,
        forwardingValue: 0,
        writesRegister: undefined,
    };
}

// ─── Register Analysis Helpers ────────────────────────────────────────────────
// Pure functions that extract register usage metadata from a decoded instruction.
// These are the single source of truth for "which registers does this instruction
// touch", replacing the ad-hoc logic that was previously inline in the pipeline loop.

const BRANCH_NO_WRITE = new Set([
    "BEQ", "BNE", "BLTZ",
    "BLEZALC", "BGTZALC", "BEQZALC", "BNEZALC",
    "BLEZC", "BGTZC",
]);

/**
 * Returns the source register indices that a decoded instruction reads.
 * Used by the hazard unit to detect RAW dependencies.
 */
export function getReadRegisters(decoded: Instruction): number[] {
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
 * Returns the destination register index that a decoded instruction writes,
 * or undefined if the instruction does not write to any register.
 */
export function getWriteRegister(decoded: Instruction): number | undefined {
    if (decoded.op === "NOP") return undefined;
    if (decoded.op === "SW") return undefined;
    if (decoded.type === "J" || decoded.op === "BC") return undefined;
    if (BRANCH_NO_WRITE.has(decoded.op)) return undefined;

    return decoded.target !== 0 ? decoded.target : undefined;
}

/**
 * Returns true if the instruction is a load (LW).
 * Load instructions have a 1-cycle latency before their result is available,
 * requiring a stall when the next instruction reads the loaded register.
 */
export function isLoadInstruction(decoded: Instruction): boolean {
    return decoded.op === "LW";
}
