//    and defines the available operations from the architecture to be implemented.
//  - in other words, every compiler knows how to read in its own terms.

import { extractBits } from "../../helpers/bits.helper";
import { decodeByFormat } from "../../helpers/instruction.helper";
import { INSTRUCTION_DEFINITIONS } from "../../isa/mipsv6";
import { semantics } from "../../isa/mipsv6/semantics";
import type {
    Compiler,
    InstructionReturn,
    Program,
    ExecuteOutput,
    MemoryOutput,
    Instruction,
    ExecutionContext,
    MemoryOperationExecuteOutput,
} from "../abstracts";

export default class MIPSv6Compiler implements Compiler {

    fetch(program: Program, ctx: ExecutionContext): number {

        const { pc, memory } = ctx
        if (pc < 0 || pc >= memory.addresses) {
            throw new Error(`PC (${pc}) is out of bounds for memory of size ${memory.addresses} `)
        }

        const instruction = program.instructions[pc];
        if (!instruction) throw new Error(`No instruction found at PC (${pc})`)

        ctx.pc++;

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

    execute(decoded: Instruction, ctx: ExecutionContext): ExecuteOutput {
        const semanticFn = semantics[decoded.op];

        if (!semanticFn) {
            throw new Error(`Unimplemented execute semantic: ${decoded.op}`);
        }

        return semanticFn(decoded, ctx);
    }

    memoryAccess(execResult: ExecuteOutput, ctx: ExecutionContext): MemoryOutput {
        const exec = execResult as MemoryOperationExecuteOutput;

        if (exec.storeValue !== undefined) {
            ctx.memory.write(exec.aluResult, exec.storeValue);
            return { valueToWrite: 0 };
        }

        if (exec.isLoad) {
            const dato = ctx.memory.read(exec.aluResult);
            const result: MemoryOutput = { valueToWrite: dato };
            if (exec.targetRegister !== undefined) {
                result.targetRegister = exec.targetRegister;
            }
            return result;
        }

        const result: MemoryOutput = { valueToWrite: exec.aluResult };
        if (exec.targetRegister !== undefined) {
            result.targetRegister = exec.targetRegister;
        }
        return result;
    }

    writeback(memResult: MemoryOutput, ctx: ExecutionContext): void {
        if (memResult.targetRegister !== undefined && memResult.targetRegister !== 0) {
            ctx.registers.write(memResult.targetRegister, memResult.valueToWrite);
        }
    }

    instructionCycle(program: Program, ctx: ExecutionContext): InstructionReturn {
        const word = this.fetch(program, ctx);
        const decoded = this.decode(word, ctx);
        const execResult = this.execute(decoded, ctx);
        const memResult = this.memoryAccess(execResult, ctx);
        this.writeback(memResult, ctx);
        return { status: "OK" };
    }
}