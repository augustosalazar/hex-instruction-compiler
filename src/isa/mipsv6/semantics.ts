import type { ExecutionContext, Instruction, MemoryOperationExecuteOutput } from "../../types/abstracts";
import alu from "../../core/primitives/alu";

export const semantics: Record<string, (decoded: Instruction, ctx: ExecutionContext) => MemoryOperationExecuteOutput> = {
    NOP(decoded, ctx) {
        return {
            aluResult: 0,
        };
    },
    ADD(decoded, ctx) {
        const val1 = ctx.registers.read(decoded.operand1); // rs
        const val2 = ctx.registers.read(decoded.operand2); // rt

        return {
            aluResult: alu.add(val1, val2),
            targetRegister: decoded.target // rd
        };
    },
    ADDU(decoded, ctx) {
        const val1 = ctx.registers.read(decoded.operand1);
        const val2 = ctx.registers.read(decoded.operand2);

        return {
            aluResult: alu.addu(val1, val2),
            targetRegister: decoded.target
        };
    },
    SUB(decoded, ctx) {
        const val1 = ctx.registers.read(decoded.operand1);
        const val2 = ctx.registers.read(decoded.operand2);

        return {
            aluResult: alu.sub(val1, val2),
            targetRegister: decoded.target
        };
    },
    ADDIU(decoded, ctx) {
        const val1 = ctx.registers.read(decoded.operand1); // rs
        const imm = (decoded.operand2 << 16) >> 16; // sign-extend

        return {
            aluResult: alu.addu(val1, imm),
            targetRegister: decoded.target // rt
        };
    },
    LW(decoded, ctx) {
        const base = ctx.registers.read(decoded.operand1); // rs
        const offset = (decoded.operand2 << 16) >> 16; // sign-extend

        return {
            aluResult: alu.add(base, offset), // Memory Address
            isLoad: true,
            targetRegister: decoded.target // rt
        };
    },
    SW(decoded, ctx) {
        const base = ctx.registers.read(decoded.operand1); // rs
        const offset = (decoded.operand2 << 16) >> 16; // sign-extend

        return {
            aluResult: alu.add(base, offset), // Memory Address
            storeValue: ctx.registers.read(decoded.target), // Value to store from rt
        };
    },
};