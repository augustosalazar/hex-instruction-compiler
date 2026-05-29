import type { Instruction } from './Program';
import type { MemoryOperationExecuteOutput, MemoryOutput } from './StepResults';

// ─── Stage Context Interfaces ─────────────────────────────────────────────────
// Each pipeline stage produces a typed context that explicitly declares
// which registers are read/written, enabling clean hazard detection and
// allowing library consumers to introspect pipeline state.
//
// Note: bubble factory functions (bubbleID, bubbleEX, bubbleMEM) now accept an
// ISA-provided NOP instruction so the pipeline core stays ISA-agnostic.
// Use processor.nopInstruction() to obtain it.

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

/** Pipeline cycle snapshot for introspection / visualization */
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

// ─── Bubble Factories ─────────────────────────────────────────────────────────
// Create "empty" stage contexts (bubbles/NOPs) for pipeline initialization
// and flush/stall insertion.
//
// bubbleIF has no instruction payload, so it needs no nop parameter.
// bubbleID/EX/MEM carry a decoded instruction in their latch; pass the result
// of processor.nopInstruction() to keep them ISA-agnostic.

export function bubbleIF(): IFStageContext {
    return { valid: false, word: 0, pc: 0 };
}

export function bubbleID(nop: Instruction): IDStageContext {
    return {
        valid: false,
        decoded: nop,
        pc: 0,
        readsRegisters: [],
        writesRegister: undefined,
        isLoad: false,
    };
}

export function bubbleEX(nop: Instruction): EXStageContext {
    return {
        valid: false,
        decoded: nop,
        execResult: { aluResult: 0 },
        pc: 0,
        forwardingValue: 0,
        writesRegister: undefined,
        isLoad: false,
    };
}

export function bubbleMEM(nop: Instruction): MEMStageContext {
    return {
        valid: false,
        decoded: nop,
        memResult: { valueToWrite: 0 },
        pc: 0,
        forwardingValue: 0,
        writesRegister: undefined,
    };
}
