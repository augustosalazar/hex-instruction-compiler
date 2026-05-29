//    and defines the available operations from the architecture to be implemented.
//  - in other words, every compiler knows how to read in its own terms.

import { extractBits } from "../helpers/bits.helper";
import { decodeByFormat } from "../helpers/instruction.helper";
import { INSTRUCTION_DEFINITIONS } from "../isa/mipsv6";
import { semantics } from "../isa/mipsv6/semantics";
import { MIPS_NOP, mipsGetReadRegisters, mipsGetWriteRegister, mipsIsLoadInstruction } from "../isa/mipsv6/pipeline-helpers";
import type {
    Processor,
    InstructionReturn,
    Program,
    MemoryOutput,
    Instruction,
    ExecutionContext,
    MemoryOperationExecuteOutput,
} from "../types/abstracts";

export default class MIPSv6Processor implements Processor {

    fetch(program: Program, ctx: ExecutionContext): number {

        const { pc, memory } = ctx
        if (pc < 0 || pc >= memory.addresses) {
            throw new Error(`PC (${pc}) is out of bounds for memory of size ${memory.addresses} `)
        }

        const instruction = program.instructions[pc];
        if (instruction === undefined) throw new Error(`No instruction found at PC (${pc})`)

        //named 'plusFour' for convention. programatically only add 1
        const pcPlusFour = ctx.pc + 1;

        //check ctx to see if there is a delay pending.
        //if there is a delay pending, choose the targetAddress over pcPlusFour.
        //the delaySlot instruction is always executed, but only sometimes does PC jump to targetAddress afterwards
        if (ctx.delayPending && ctx.jumpAddress) {
            ctx.pc = ctx.jumpAddress;
            ctx.delayPending = false;
            ctx.jumpAddress = 0;
        } else {
            ctx.pc = pcPlusFour;
        }

        return instruction;
    }

    decode(instruction: number, ctx: ExecutionContext): Instruction {
        const opcode = extractBits(instruction, 26, 6)
        const funct = extractBits(instruction, 0, 6)
        const shamt = extractBits(instruction, 6, 5)

        // We go through all the instructions and find the one that matches the pattern
        const definition = INSTRUCTION_DEFINITIONS.find(def => {
            const { opcode: defOp, funct: defFunct, shamt: defShamt } = def.pattern
            if (defOp !== opcode) return false
            if (defFunct !== undefined && defFunct !== funct) return false
            if (defShamt !== undefined && defShamt !== shamt) return false

            return true;
        })

        if (!definition) throw new Error(`Unknown instruction: opcode ${opcode}, funct ${funct}, shamt ${shamt}`)

        // Decode the instruction based on the format (R-type, I-type, J-type)
        const fields = decodeByFormat(instruction, definition.format);

        // Map the fields to the generic instruction format
        return {
            op: definition.semantic,
            ...definition.format.mapFields(fields)
        };
    }

    execute(
        decoded: Instruction,
        ctx: ExecutionContext,
        forwarded?: ReadonlyMap<number, number>,
        executionPC?: number,
    ): MemoryOperationExecuteOutput {
        const semanticFn = semantics[decoded.op];

        if (!semanticFn) {
            throw new Error(`Unimplemented execute semantic: ${decoded.op}`);
        }

        // Save and override ctx.pc if the runner provides an effective PC for this
        // instruction (e.g. branch target calculation needs PC+4, not the current pipeline PC).
        const savedPC = ctx.pc;
        if (executionPC !== undefined) ctx.pc = executionPC;

        // Apply forwarded register values for this cycle.
        // We temporarily override the register file so the semantic function
        // reads the forwarded value without any changes to its own logic.
        const saved = new Map<number, number>();
        if (forwarded) {
            for (const [reg, val] of forwarded) {
                saved.set(reg, ctx.registers.read(reg));
                ctx.registers.write(reg, val);
            }
        }

        const result = semanticFn(decoded, ctx);

        // Restore register file and PC to their real pipeline values.
        for (const [reg, val] of saved) {
            ctx.registers.write(reg, val);
        }
        if (executionPC !== undefined) ctx.pc = savedPC;

        return result;
    }

    memoryAccess(execResult: MemoryOperationExecuteOutput, ctx: ExecutionContext): MemoryOutput {
        if (execResult.hasJump) {
            return { valueToWrite: execResult.aluResult, hasJump: execResult.hasJump, hasDelay: execResult.hasDelay };
        }

        if (execResult.storeValue !== undefined) {
            ctx.memory.write(execResult.aluResult, execResult.storeValue);
            return { valueToWrite: 0 };
        }

        if (execResult.isLoad) {
            const dato = ctx.memory.read(execResult.aluResult);
            const result: MemoryOutput = { valueToWrite: dato };
            if (execResult.targetRegister !== undefined) {
                result.targetRegister = execResult.targetRegister;
            }
            return result;
        }

        const result: MemoryOutput = { valueToWrite: execResult.aluResult };
        if (execResult.targetRegister !== undefined) {
            result.targetRegister = execResult.targetRegister;
        }
        return result;
    }

    writeback(memResult: MemoryOutput, ctx: ExecutionContext): void {
        if (memResult.targetRegister !== undefined && memResult.targetRegister !== 0) {
            ctx.registers.write(memResult.targetRegister, memResult.valueToWrite);
            return
        }

        if (memResult.hasJump) {
            if (memResult.hasDelay) {
                //if jump with delay => store data in context so that fetch() step retrieves it
                ctx.delayPending = true;
                ctx.jumpAddress = memResult.valueToWrite;
            } else {
                //if no delay => change pc inmediately
                ctx.pc = memResult.valueToWrite;
            }
        }
    }

    // ── Processor pipeline-support contract ───────────────────────────────────

    nopInstruction(): Instruction {
        return MIPS_NOP;
    }

    getReadRegisters(decoded: Instruction): number[] {
        return mipsGetReadRegisters(decoded);
    }

    getWriteRegister(decoded: Instruction): number | undefined {
        return mipsGetWriteRegister(decoded);
    }

    isLoadInstruction(decoded: Instruction): boolean {
        return mipsIsLoadInstruction(decoded);
    }
}