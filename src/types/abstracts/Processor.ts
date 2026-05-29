import { Instruction, Program } from './Program';
import { MemoryOperationExecuteOutput, ExecuteOutput, MemoryOutput } from './StepResults';
import { ExecutionContext } from './execution-context.interface';

// processor interface.
// describes the minimal methods and attributes a processor needs to be used by runners.
// the idea is that every Processor has each step executed at the rate the runner function needs.
// This is so that singleCycle, pipelined and pipelinedProtected do whatever they deem fit with each stage.

// The runner provides the register unit and the PC to the Processor so that
// it knows which Instruction to execute and the values in the operand registers.

export interface Processor {

    // 1. IF (Instruction Fetch)
    fetch(program: Program, ctx: ExecutionContext): number;

    // 2. ID (Instruction Decode)
    decode(word: number, ctx: ExecutionContext): Instruction;

    // 3. EX (Execute)
    // forwarded:    optional register-value overrides for this cycle (pipeline forwarding)
    // executionPC:  effective PC for this instruction, used for relative branch target calculation
    execute(
        decoded: Instruction,
        ctx: ExecutionContext,
        forwarded?: ReadonlyMap<number, number>,
        executionPC?: number,
    ): MemoryOperationExecuteOutput;

    // 4. MEM (Memory Access)
    memoryAccess(execResult: MemoryOperationExecuteOutput, ctx: ExecutionContext): MemoryOutput;

    // 5. WB (Write Back)
    writeback(memResult: MemoryOutput, ctx: ExecutionContext): void;

    // ── Pipeline support ──────────────────────────────────────────────────────
    // These methods let the runner be ISA-agnostic: it never hard-codes opcode
    // strings or instruction-type literals; it delegates all ISA knowledge here.

    /** Returns an ISA-specific NOP / bubble instruction for pipeline fill. */
    nopInstruction(): Instruction;

    /** Returns the source register indices this instruction reads during EX. */
    getReadRegisters(decoded: Instruction): number[];

    /** Returns the destination register this instruction writes, or undefined. */
    getWriteRegister(decoded: Instruction): number | undefined;

    /** Returns true if this is a load instruction (triggers load-use hazard detection). */
    isLoadInstruction(decoded: Instruction): boolean;
}