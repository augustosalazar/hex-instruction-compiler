import type { ExecutionContext, Instruction, MemoryOperationExecuteOutput, PipelineContext } from "../../types/abstracts";
import alu from "../../core/hardware/alu";

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
    ORI(decoded, ctx) {
        const val1 = ctx.registers.read(decoded.operand1); // rs
        const imm = decoded.operand2;
        return {
            aluResult: alu.or(val1, imm),
            targetRegister: decoded.target // rt
        };
    },
    XORI(decoded, ctx) {
        const val1 = ctx.registers.read(decoded.operand1); // rs
        const imm = decoded.operand2;
        return {
            aluResult: alu.xor(val1, imm),
            targetRegister: decoded.target
        };
    },
    SLTI(decoded, ctx) {
        const val1 = ctx.registers.read(decoded.operand1); // rs
        const imm = (decoded.operand2 << 16) >> 16;     // sign-extend
        return {
            aluResult: alu.slt(val1, imm),
            targetRegister: decoded.target
        };
    },
    SLTIU(decoded, ctx) {
        const val1 = ctx.registers.read(decoded.operand1); // rs
        const imm = decoded.operand2;
        return {
            aluResult: alu.sltu(val1, imm),
            targetRegister: decoded.target
        };
    },
    ANDI(decoded, ctx) {
        const val1 = ctx.registers.read(decoded.operand1);
        const imm = decoded.operand2;
        return {
            aluResult: alu.and(val1, imm),
            targetRegister: decoded.target
        };
    },
    SUBU(decoded, ctx) {
        const val1 = ctx.registers.read(decoded.operand1);
        const val2 = ctx.registers.read(decoded.operand2);
        return {
            aluResult: alu.subu(val1, val2),
            targetRegister: decoded.target
        };
    },
    MUL(decoded, ctx) {
        const val1 = ctx.registers.read(decoded.operand1);
        const val2 = ctx.registers.read(decoded.operand2);
        return {
            aluResult: alu.mul(val1, val2),
            targetRegister: decoded.target
        };
    },
    MULU(decoded, ctx) {
        const val1 = ctx.registers.read(decoded.operand1);
        const val2 = ctx.registers.read(decoded.operand2);
        return {
            aluResult: alu.mulu(val1, val2),
            targetRegister: decoded.target
        };
    },
    MUH(decoded, ctx) {
        const val1 = ctx.registers.read(decoded.operand1);
        const val2 = ctx.registers.read(decoded.operand2);
        return {
            aluResult: alu.muh(val1, val2),
            targetRegister: decoded.target
        };
    },
    MUHU(decoded, ctx) {
        const val1 = ctx.registers.read(decoded.operand1);
        const val2 = ctx.registers.read(decoded.operand2);
        return {
            aluResult: alu.mulhu(val1, val2),
            targetRegister: decoded.target
        };
    },
    DIV(decoded, ctx) {
        const val1 = ctx.registers.read(decoded.operand1);
        const val2 = ctx.registers.read(decoded.operand2);
        return {
            aluResult: alu.div(val1, val2),
            targetRegister: decoded.target
        };
    },
    DIVU(decoded, ctx) {
        const val1 = ctx.registers.read(decoded.operand1);
        const val2 = ctx.registers.read(decoded.operand2);
        return {
            aluResult: alu.divu(val1, val2),
            targetRegister: decoded.target
        };
    },
    MOD(decoded, ctx) {
        const val1 = ctx.registers.read(decoded.operand1);
        const val2 = ctx.registers.read(decoded.operand2);
        return {
            aluResult: alu.mod(val1, val2),
            targetRegister: decoded.target
        };
    },
    MODU(decoded, ctx) {
        const val1 = ctx.registers.read(decoded.operand1);
        const val2 = ctx.registers.read(decoded.operand2);
        return {
            aluResult: alu.modu(val1, val2),
            targetRegister: decoded.target
        };
    },
    AND(decoded, ctx) {
        const val1 = ctx.registers.read(decoded.operand1);
        const val2 = ctx.registers.read(decoded.operand2);
        return {
            aluResult: alu.and(val1, val2),
            targetRegister: decoded.target
        };
    },
    OR(decoded, ctx) {
        const val1 = ctx.registers.read(decoded.operand1);
        const val2 = ctx.registers.read(decoded.operand2);
        return {
            aluResult: alu.or(val1, val2),
            targetRegister: decoded.target
        };
    },
    XOR(decoded, ctx) {
        const val1 = ctx.registers.read(decoded.operand1);
        const val2 = ctx.registers.read(decoded.operand2);
        return {
            aluResult: alu.xor(val1, val2),
            targetRegister: decoded.target
        };
    },
    NOR(decoded, ctx) {
        const val1 = ctx.registers.read(decoded.operand1);
        const val2 = ctx.registers.read(decoded.operand2);
        return {
            aluResult: alu.nor(val1, val2),
            targetRegister: decoded.target
        };
    },
    SLT(decoded, ctx) {
        const val1 = ctx.registers.read(decoded.operand1);
        const val2 = ctx.registers.read(decoded.operand2);
        return {
            aluResult: alu.slt(val1, val2),
            targetRegister: decoded.target
        };
    },
    SLTU(decoded, ctx) {
        const val1 = ctx.registers.read(decoded.operand1);
        const val2 = ctx.registers.read(decoded.operand2);
        return {
            aluResult: alu.sltu(val1, val2),
            targetRegister: decoded.target
        };
    },
    BEQ(decoded, ctx) { // rs == rt ? *delay

        const val1 = ctx.registers.read(decoded.operand1);
        const imm = decoded.operand2;
        const val2 = ctx.registers.read(decoded.target);
        return {
            aluResult: alu.add(ctx.pc, imm),
            hasJump: alu.sub(val1, val2) === 0,
            hasDelay: true
        };
    },
    BLEZALC(decoded, ctx) { // rt <= 0 ?
        const val2 = ctx.registers.read(decoded.target);
        const imm = decoded.operand2;

        return {
            aluResult: alu.add(ctx.pc, imm),
            hasJump: alu.sub(0, val2) <= 0,//???
            hasDelay: false
        };
    },
    BGTZALC(decoded, ctx) { // rt > 0 ?
        const val2 = ctx.registers.read(decoded.target);
        const imm = decoded.operand2;

        return {
            aluResult: alu.add(ctx.pc, imm),
            hasJump: alu.sub(0, val2) > 0,//???
            hasDelay: false
        };
    },
    BEQZALC(decoded, ctx) { // rt == 0 ?
        const val2 = ctx.registers.read(decoded.target);
        const imm = decoded.operand2;

        return {
            aluResult: alu.add(ctx.pc, imm),
            hasJump: alu.sub(0, val2) === 0,//???
            hasDelay: false
        };
    },
    BNEZALC(decoded, ctx) { // rt != 0 ?
        const val2 = ctx.registers.read(decoded.target);
        const imm = decoded.operand2;

        return {
            aluResult: alu.add(ctx.pc, imm),
            hasJump: alu.sub(0, val2) !== 0,//???
            hasDelay: false
        };
    },
    BLEZC(decoded, ctx) { // idk
    },
    BGTZC(decoded, ctx) { // signed compare rt > 0
        const val2 = ctx.registers.read(decoded.target);
        const imm = decoded.operand2;

        return {
            aluResult: alu.add(ctx.pc, imm),
            hasJump: alu.sub(0, val2) <= 0,//???
            hasDelay: false
        };
    },
    BLTZ(decoded, ctx) { // rs < 0 (sign bit 1?) *delay
    },
    BNE(decoded, ctx) { // rs != rt *delay
        const val1 = ctx.registers.read(decoded.operand1);
        const imm = decoded.operand2;
        const val2 = ctx.registers.read(decoded.target);
        return {
            aluResult: alu.add(ctx.pc, imm),
            hasJump: alu.sub(val1, val2) !== 0
        };
    },

};