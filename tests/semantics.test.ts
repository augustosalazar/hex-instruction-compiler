import {
    MIPSv6Processor,
    RegisterUnit,
    MemoryUnit,
    singleCycle,
    singleCycleRun,
    type ExecutionContext,
    type Instruction,
    type MemoryOperationExecuteOutput,
    mipsv6Registers as registers,
} from "../src/index";
import { parseHexProgram } from "../src/helpers/parser.helper";
import { semantics } from "../src/isa/mipsv6/semantics";

/**
 * Unit and integration tests for the MIPS v6 instruction semantics table.
 *
 * The semantic functions define what an instruction computes during the
 * execute stage. They return an execution result, and the processor then uses
 * memoryAccess/writeback to make the result visible in registers, memory, or PC.
 */
function createContext(memoryAddresses = 1024): ExecutionContext {
    return {
        registers: new RegisterUnit(new Array(32)),
        memory: new MemoryUnit(32, memoryAddresses),
        pc: 0,
    };
}

function setRegister(ctx: ExecutionContext, regIndex: number, value: number) {
    ctx.registers.write(regIndex, value);
}

function getRegister(ctx: ExecutionContext, regIndex: number): number {
    return ctx.registers.read(regIndex);
}

function getSignedRegister(ctx: ExecutionContext, regIndex: number): number {
    return getRegister(ctx, regIndex) | 0;
}

function rInstruction(op: string, rd: number, rs: number, rt: number): Instruction {
    return { type: "R", op, operand1: rs, operand2: rt, target: rd };
}

function iInstruction(op: string, rt: number, rs: number, immediate: number): Instruction {
    return { type: "I", op, operand1: rs, operand2: immediate, target: rt };
}

function jInstruction(op: string, immediate: number): Instruction {
    return { type: "J", op, operand1: immediate, operand2: 0, target: 0 };
}

function executeInstruction(
    decoded: Instruction,
    ctx: ExecutionContext
): MemoryOperationExecuteOutput {
    const processor = new MIPSv6Processor();
    const execResult = processor.execute(decoded, ctx) as MemoryOperationExecuteOutput;
    const memResult = processor.memoryAccess(execResult, ctx);
    processor.writeback(memResult, ctx);
    return execResult;
}

function executeSemanticOnly(
    decoded: Instruction,
    ctx: ExecutionContext
): MemoryOperationExecuteOutput {
    return semantics[decoded.op](decoded, ctx);
}

describe("MIPS Instruction Semantics", () => {
    it("exposes semantic functions for the tested instruction set", () => {
        [
            "ADD", "ADDU", "SUB", "SUBU", "MUL", "MUH", "MULU", "MUHU",
            "DIV", "DIVU", "MOD", "MODU", "AND", "OR", "XOR", "NOR",
            "SLT", "SLTU", "ADDIU", "ANDI", "ORI", "XORI", "SLTI",
            "SLTIU", "LW", "SW", "BEQ", "BNE", "BGTZC", "BLTZ", "J",
            "BC", "NOP",
        ].forEach(op => {
            expect(typeof semantics[op]).toBe("function");
        });
    });

    describe("Arithmetic R-type Instructions", () => {
        it("ADD: $rd = $rs + $rt", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 5);
            setRegister(ctx, registers.t1, 3);

            executeInstruction(rInstruction("ADD", registers.t2, registers.t0, registers.t1), ctx);

            expect(getRegister(ctx, registers.t2)).toBe(8);
        });

        it("ADD with negative numbers", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, -5);
            setRegister(ctx, registers.t1, 3);

            const result = executeInstruction(
                rInstruction("ADD", registers.t2, registers.t0, registers.t1),
                ctx
            );

            expect(result.aluResult).toBe(-2);
            expect(getSignedRegister(ctx, registers.t2)).toBe(-2);
        });

        it("SUB: $rd = $rs - $rt", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 10);
            setRegister(ctx, registers.t1, 3);

            executeInstruction(rInstruction("SUB", registers.t2, registers.t0, registers.t1), ctx);

            expect(getRegister(ctx, registers.t2)).toBe(7);
        });

        it("SUB with a negative result", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 3);
            setRegister(ctx, registers.t1, 10);

            const result = executeInstruction(
                rInstruction("SUB", registers.t2, registers.t0, registers.t1),
                ctx
            );

            expect(result.aluResult).toBe(-7);
            expect(getSignedRegister(ctx, registers.t2)).toBe(-7);
        });

        it("ADDU: unsigned addition wraps to 32 bits", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 0xffffffff);
            setRegister(ctx, registers.t1, 1);

            executeInstruction(rInstruction("ADDU", registers.t2, registers.t0, registers.t1), ctx);

            expect(getRegister(ctx, registers.t2)).toBe(0);
        });

        it("SUBU: unsigned subtraction wraps to 32 bits", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 0);
            setRegister(ctx, registers.t1, 1);

            executeInstruction(rInstruction("SUBU", registers.t2, registers.t0, registers.t1), ctx);

            expect(getRegister(ctx, registers.t2)).toBe(0xffffffff);
        });

        it("MUL: $rd = low 32 bits of $rs * $rt", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 100);
            setRegister(ctx, registers.t1, 50);

            executeInstruction(rInstruction("MUL", registers.t2, registers.t0, registers.t1), ctx);

            expect(getRegister(ctx, registers.t2)).toBe(5000);
        });

        it("MUH: $rd = high signed bits of $rs * $rt", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 0x80000000);
            setRegister(ctx, registers.t1, 2);

            const result = executeInstruction(
                rInstruction("MUH", registers.t2, registers.t0, registers.t1),
                ctx
            );

            expect(result.aluResult).toBe(-1);
            expect(getRegister(ctx, registers.t2)).toBe(0xffffffff);
        });

        it("MULU: unsigned multiplication returns low 32 bits", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 0xffffffff);
            setRegister(ctx, registers.t1, 2);

            executeInstruction(rInstruction("MULU", registers.t2, registers.t0, registers.t1), ctx);

            expect(getRegister(ctx, registers.t2)).toBe(0xfffffffe);
        });

        it("MUHU/MULHU: unsigned multiplication returns high 32 bits", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 0xffffffff);
            setRegister(ctx, registers.t1, 2);

            executeInstruction(rInstruction("MUHU", registers.t2, registers.t0, registers.t1), ctx);

            expect(getRegister(ctx, registers.t2)).toBe(1);
        });

        it("DIV: signed division truncates toward zero", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 15);
            setRegister(ctx, registers.t1, 4);

            executeInstruction(rInstruction("DIV", registers.t2, registers.t0, registers.t1), ctx);

            expect(getRegister(ctx, registers.t2)).toBe(3);
        });

        it("DIV with negative numbers truncates toward zero", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, -15);
            setRegister(ctx, registers.t1, 4);

            const result = executeInstruction(
                rInstruction("DIV", registers.t2, registers.t0, registers.t1),
                ctx
            );

            expect(result.aluResult).toBe(-3);
            expect(getSignedRegister(ctx, registers.t2)).toBe(-3);
        });

        it("MOD: signed modulo returns the remainder", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 15);
            setRegister(ctx, registers.t1, 4);

            executeInstruction(rInstruction("MOD", registers.t2, registers.t0, registers.t1), ctx);

            expect(getRegister(ctx, registers.t2)).toBe(3);
        });

        it("DIVU and MODU use unsigned operands", () => {
            const divCtx = createContext();
            setRegister(divCtx, registers.t0, -1);
            setRegister(divCtx, registers.t1, 2);

            executeInstruction(rInstruction("DIVU", registers.t2, registers.t0, registers.t1), divCtx);

            const modCtx = createContext();
            setRegister(modCtx, registers.t0, -1);
            setRegister(modCtx, registers.t1, 2);

            executeInstruction(rInstruction("MODU", registers.t2, registers.t0, registers.t1), modCtx);

            expect(getRegister(divCtx, registers.t2)).toBe(2147483647);
            expect(getRegister(modCtx, registers.t2)).toBe(1);
        });
    });

    describe("Logical R-type Instructions", () => {
        it("AND: $rd = $rs & $rt", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 0b1100);
            setRegister(ctx, registers.t1, 0b1010);

            executeInstruction(rInstruction("AND", registers.t2, registers.t0, registers.t1), ctx);

            expect(getRegister(ctx, registers.t2)).toBe(0b1000);
        });

        it("OR: $rd = $rs | $rt", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 0b1100);
            setRegister(ctx, registers.t1, 0b1010);

            executeInstruction(rInstruction("OR", registers.t2, registers.t0, registers.t1), ctx);

            expect(getRegister(ctx, registers.t2)).toBe(0b1110);
        });

        it("XOR: $rd = $rs ^ $rt", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 0b1100);
            setRegister(ctx, registers.t1, 0b1010);

            executeInstruction(rInstruction("XOR", registers.t2, registers.t0, registers.t1), ctx);

            expect(getRegister(ctx, registers.t2)).toBe(0b0110);
        });

        it("NOR: $rd = ~($rs | $rt)", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 0b1100);
            setRegister(ctx, registers.t1, 0b1010);

            const result = executeInstruction(
                rInstruction("NOR", registers.t2, registers.t0, registers.t1),
                ctx
            );

            expect(result.aluResult).toBe(~0b1110);
            expect(getSignedRegister(ctx, registers.t2)).toBe(~0b1110);
        });
    });

    describe("Comparison R-type Instructions", () => {
        it("SLT: $rd = ($rs < $rt) ? 1 : 0", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 5);
            setRegister(ctx, registers.t1, 10);

            executeInstruction(rInstruction("SLT", registers.t2, registers.t0, registers.t1), ctx);

            expect(getRegister(ctx, registers.t2)).toBe(1);
        });

        it("SLT returns 0 when $rs is not less than $rt", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 10);
            setRegister(ctx, registers.t1, 5);

            executeInstruction(rInstruction("SLT", registers.t2, registers.t0, registers.t1), ctx);

            expect(getRegister(ctx, registers.t2)).toBe(0);
        });

        it("SLT compares negative signed values", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, -5);
            setRegister(ctx, registers.t1, -1);

            executeInstruction(rInstruction("SLT", registers.t2, registers.t0, registers.t1), ctx);

            expect(getRegister(ctx, registers.t2)).toBe(1);
        });

        it("SLTU compares unsigned values", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, -1);
            setRegister(ctx, registers.t1, 1);

            executeInstruction(rInstruction("SLTU", registers.t2, registers.t0, registers.t1), ctx);

            expect(getRegister(ctx, registers.t2)).toBe(0);
        });
    });

    describe("I-type Arithmetic Instructions", () => {
        it("ADDIU: $rt = $rs + immediate", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 100);

            executeInstruction(iInstruction("ADDIU", registers.t1, registers.t0, 50), ctx);

            expect(getRegister(ctx, registers.t1)).toBe(150);
        });

        it("ADDIU sign-extends a negative immediate", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 100);

            executeInstruction(iInstruction("ADDIU", registers.t1, registers.t0, 0xffe2), ctx);

            expect(getRegister(ctx, registers.t1)).toBe(70);
        });

        it("ADDIU wraps unsigned overflow to 32 bits", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 0xffffffff);

            executeInstruction(iInstruction("ADDIU", registers.t1, registers.t0, 1), ctx);

            expect(getRegister(ctx, registers.t1)).toBe(0);
        });
    });

    describe("I-type Logical Instructions", () => {
        it("ANDI: $rt = $rs & immediate", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 0xff);

            executeInstruction(iInstruction("ANDI", registers.t1, registers.t0, 0x0f), ctx);

            expect(getRegister(ctx, registers.t1)).toBe(0x0f);
        });

        it("ORI: $rt = $rs | immediate", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 0xf0);

            executeInstruction(iInstruction("ORI", registers.t1, registers.t0, 0x0f), ctx);

            expect(getRegister(ctx, registers.t1)).toBe(0xff);
        });

        it("XORI: $rt = $rs ^ immediate", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 0xff);

            executeInstruction(iInstruction("XORI", registers.t1, registers.t0, 0x0f), ctx);

            expect(getRegister(ctx, registers.t1)).toBe(0xf0);
        });
    });

    describe("I-type Comparison Instructions", () => {
        it("SLTI: $rt = ($rs < immediate) ? 1 : 0", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 5);

            executeInstruction(iInstruction("SLTI", registers.t1, registers.t0, 10), ctx);

            expect(getRegister(ctx, registers.t1)).toBe(1);
        });

        it("SLTIU compares unsigned values", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, -1);

            executeInstruction(iInstruction("SLTIU", registers.t1, registers.t0, 1), ctx);

            expect(getRegister(ctx, registers.t1)).toBe(0);
        });
    });

    describe("Load/Store Instructions (Memory Access)", () => {
        it("LW: $rt = Mem[$rs + offset]", () => {
            const ctx = createContext(0x2000);
            ctx.memory.write(0x1000, 0x12345678);
            setRegister(ctx, registers.t0, 0x1000);

            executeInstruction(iInstruction("LW", registers.t1, registers.t0, 0), ctx);

            expect(getRegister(ctx, registers.t1)).toBe(0x12345678);
        });

        it("LW reads with a positive offset", () => {
            const ctx = createContext(0x2000);
            ctx.memory.write(0x1004, 0xdeadbeef);
            setRegister(ctx, registers.t0, 0x1000);

            executeInstruction(iInstruction("LW", registers.t1, registers.t0, 4), ctx);

            expect(getRegister(ctx, registers.t1)).toBe(0xdeadbeef);
        });

        it("SW: Mem[$rs + offset] = $rt", () => {
            const ctx = createContext(0x2000);
            setRegister(ctx, registers.t0, 0x1000);
            setRegister(ctx, registers.t1, 0x12345678);

            executeInstruction(iInstruction("SW", registers.t1, registers.t0, 0), ctx);

            expect(ctx.memory.read(0x1000)).toBe(0x12345678);
        });

        it("SW writes with a positive offset", () => {
            const ctx = createContext(0x2000);
            setRegister(ctx, registers.t0, 0x1000);
            setRegister(ctx, registers.t1, 0xdeadbeef);

            executeInstruction(iInstruction("SW", registers.t1, registers.t0, 8), ctx);

            expect(ctx.memory.read(0x1008)).toBe(0xdeadbeef);
        });

        it("supports multiple LW and SW operations", () => {
            const ctx = createContext(0x2000);
            setRegister(ctx, registers.t0, 0x1000);
            setRegister(ctx, registers.t1, 0x11111111);
            setRegister(ctx, registers.t2, 0x22222222);
            setRegister(ctx, registers.t3, 0x33333333);

            executeInstruction(iInstruction("SW", registers.t1, registers.t0, 0), ctx);
            executeInstruction(iInstruction("SW", registers.t2, registers.t0, 4), ctx);
            executeInstruction(iInstruction("SW", registers.t3, registers.t0, 8), ctx);
            executeInstruction(iInstruction("LW", registers.s0, registers.t0, 0), ctx);
            executeInstruction(iInstruction("LW", registers.s1, registers.t0, 4), ctx);
            executeInstruction(iInstruction("LW", registers.s2, registers.t0, 8), ctx);

            expect(getRegister(ctx, registers.s0)).toBe(0x11111111);
            expect(getRegister(ctx, registers.s1)).toBe(0x22222222);
            expect(getRegister(ctx, registers.s2)).toBe(0x33333333);
        });
    });

    describe("Branch Instructions (Conditional Jumps)", () => {
        it("BEQ branches when $rs == $rt", () => {
            const ctx = createContext();
            ctx.pc = 4;
            setRegister(ctx, registers.t0, 5);
            setRegister(ctx, registers.t1, 5);

            const result = executeSemanticOnly(iInstruction("BEQ", registers.t1, registers.t0, 2), ctx);

            expect(result.hasJump).toBe(true);
            expect(result.hasDelay).toBe(true);
            expect(result.aluResult).toBe(6);
        });

        it("BEQ does not branch when values differ", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 5);
            setRegister(ctx, registers.t1, 3);

            const result = executeSemanticOnly(iInstruction("BEQ", registers.t1, registers.t0, 2), ctx);

            expect(result.hasJump).toBe(false);
        });

        it("BNE branches when $rs != $rt", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 5);
            setRegister(ctx, registers.t1, 3);

            const result = executeSemanticOnly(iInstruction("BNE", registers.t1, registers.t0, 2), ctx);

            expect(result.hasJump).toBe(true);
        });

        it("BNE does not branch when values are equal", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 5);
            setRegister(ctx, registers.t1, 5);

            const result = executeSemanticOnly(iInstruction("BNE", registers.t1, registers.t0, 2), ctx);

            expect(result.hasJump).toBe(false);
        });

        it("BGTZC branches when the tested register is greater than zero without delay", () => {
            const ctx = createContext();
            ctx.pc = 10;
            setRegister(ctx, registers.t0, 1);

            const result = executeSemanticOnly(iInstruction("BGTZC", registers.t0, registers.zero, 2), ctx);

            expect(result.hasJump).toBe(true);
            expect(result.hasDelay).toBe(false);
            expect(result.aluResult).toBe(12);
        });

        it("BLTZ branches when $rs is less than zero with delay", () => {
            const ctx = createContext();
            ctx.pc = 10;
            setRegister(ctx, registers.t0, -1);

            const result = executeSemanticOnly(iInstruction("BLTZ", registers.zero, registers.t0, 2), ctx);

            expect(result.hasJump).toBe(true);
            expect(result.hasDelay).toBe(true);
            expect(result.aluResult).toBe(12);
        });
    });

    describe("Jump Instructions (Unconditional)", () => {
        it("J performs an unconditional jump and keeps the upper PC bits", () => {
            const ctx = createContext();
            ctx.pc = 0x10000000;

            const result = executeSemanticOnly(jInstruction("J", 0x00000003), ctx);

            expect(result.hasJump).toBe(true);
            expect(result.hasDelay).toBe(true);
            expect(result.aluResult).toBe(0x1000000c);
        });

        it("BC performs an unconditional compact branch without delay", () => {
            const ctx = createContext();
            ctx.pc = 10;

            const result = executeSemanticOnly(jInstruction("BC", 4), ctx);

            expect(result.hasJump).toBe(true);
            expect(result.hasDelay).toBe(false);
            expect(result.aluResult).toBe(14);
        });
    });

    describe("Special Instructions", () => {
        it("NOP does not change registers or memory", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 123);
            ctx.memory.write(10, 456);

            executeInstruction(rInstruction("NOP", registers.zero, registers.zero, registers.zero), ctx);

            expect(getRegister(ctx, registers.t0)).toBe(123);
            expect(ctx.memory.read(10)).toBe(456);
        });
    });

    describe("Real classroom program execution", () => {
        it("executes the simpleRAMSolved sequence with ADDIU, ADD, NOP, and ORI", () => {
            const program = parseHexProgram(
                "25490001 01294820 00000000 25290001 2408000F 240A000F 01295820 016B6020 018C6820"
            );
            const processor = new MIPSv6Processor();
            const ctx = createContext();

            singleCycleRun(processor, program, ctx);

            expect(getRegister(ctx, registers.t0)).toBe(15);
            expect(getRegister(ctx, registers.t1)).toBe(3);
            expect(getRegister(ctx, registers.t2)).toBe(15);
            expect(getRegister(ctx, registers.t3)).toBe(6);
            expect(getRegister(ctx, registers.t4)).toBe(12);
            expect(getRegister(ctx, registers.t5)).toBe(24);
        });

        it("executes a simpleRamLwSwSolved-style program with LW and SW", () => {
            const program = parseHexProgram("24080064 AC080000 8C090000 AC090004 8C0A0004");
            const processor = new MIPSv6Processor();
            const ctx = createContext();

            singleCycleRun(processor, program, ctx);

            expect(ctx.memory.read(0)).toBe(100);
            expect(ctx.memory.read(4)).toBe(100);
            expect(getRegister(ctx, registers.t0)).toBe(100);
            expect(getRegister(ctx, registers.t1)).toBe(100);
            expect(getRegister(ctx, registers.t2)).toBe(100);
        });

        it("executes a branch/jump classroom program with expected final state", () => {
            const program = parseHexProgram(
                "34080005 34090005 340A0000 " +
                "11090002 254A0001 254A0001 " +
                "340B0001 " +
                "15090001 254A0001 340C0002 " +
                "240DFFFF " +
                "5C0D0002 254A0001 340E0003 340E0009 " +
                "5C0E0001 254A0001 340FAAAA " +
                "05600001 254A0001 340F5555 " +
                "C8000002 CBFFFFE9 C8000002 " +
                "34181111 C8000001 34192222 34183333"
            );
            const processor = new MIPSv6Processor();
            const ctx = createContext();

            singleCycleRun(processor, program, ctx);

            expect(getRegister(ctx, registers.t2)).toBe(4);
            expect(getRegister(ctx, registers.t8)).toBe(0x3333);
            expect(getRegister(ctx, registers.t9)).toBe(0);
        });
    });

    describe("Delay slots", () => {
        it("executes the delay slot before a delayed BEQ jump", () => {
            const program = parseHexProgram("34080001 11080001 24090005 240A0009");
            const processor = new MIPSv6Processor();
            const ctx = createContext();

            singleCycle(processor, program, ctx);
            singleCycle(processor, program, ctx);
            expect(ctx.delayPending).toBe(true);
            expect(ctx.jumpAddress).toBe(3);

            singleCycle(processor, program, ctx);
            expect(getRegister(ctx, registers.t1)).toBe(5);
            expect(ctx.delayPending).toBe(false);
            expect(ctx.pc).toBe(3);
        });

        it("compact branches without delay skip the next instruction immediately", () => {
            const program = parseHexProgram("34080001 5C080001 24090005 240A0009");
            const processor = new MIPSv6Processor();
            const ctx = createContext();

            singleCycle(processor, program, ctx);
            singleCycle(processor, program, ctx);
            singleCycle(processor, program, ctx);

            expect(getRegister(ctx, registers.t1)).toBe(0);
            expect(getRegister(ctx, registers.t2)).toBe(9);
        });
    });

    describe("Register zero special case", () => {
        it("writing to $zero never changes its value", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 5);
            setRegister(ctx, registers.t1, 3);

            executeInstruction(rInstruction("ADD", registers.zero, registers.t0, registers.t1), ctx);
            executeInstruction(iInstruction("ADDIU", registers.zero, registers.t0, 10), ctx);
            setRegister(ctx, registers.zero, 0xffffffff);

            expect(getRegister(ctx, registers.zero)).toBe(0);
        });
    });

    describe("Edge cases and error conditions", () => {
        it.each(["DIV", "DIVU", "MOD", "MODU"])("%s throws on division by zero", op => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 10);
            setRegister(ctx, registers.t1, 0);

            expect(() => {
                executeInstruction(rInstruction(op, registers.t2, registers.t0, registers.t1), ctx);
            }).toThrow("Division by zero");
        });

        it("throws when a memory access goes out of range", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 1024);

            expect(() => {
                executeInstruction(iInstruction("LW", registers.t1, registers.t0, 0), ctx);
            }).toThrow("Address out of bounds");
        });

        it("handles signed 32-bit boundaries", () => {
            const ctx = createContext();
            setRegister(ctx, registers.t0, 0x7fffffff);
            setRegister(ctx, registers.t1, 1);

            const result = executeInstruction(
                rInstruction("ADD", registers.t2, registers.t0, registers.t1),
                ctx
            );

            expect(result.aluResult).toBe(-2147483648);
            expect(getRegister(ctx, registers.t2)).toBe(0x80000000);
            expect(getSignedRegister(ctx, registers.t2)).toBe(-2147483648);
        });
    });
});
