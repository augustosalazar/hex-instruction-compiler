import {
    MIPSv6Processor,
    RegisterUnit,
    MemoryUnit,
    ExecutionContext,
    mipsv6Registers as registers,
} from "../src/index";

/**
 * Unit tests for the MIPS v6 instruction decoder.
 *
 * These cases validate the decode path in MIPSv6Processor.decode() by
 * checking instruction classification, field extraction, and error reporting
 * for R-, I-, and J-type words used by the compiler pipeline.
 */
import { extractBits } from "../src/helpers/bits.helper";
import { decodeByFormat } from "../src/helpers/instruction.helper";
import { R_TYPE, I_TYPE, J_TYPE } from "../src/isa/mipsv6/formats";

describe("MIPSv6 Instruction Decoder", () => {
    const createContext = (): ExecutionContext => ({
        registers: new RegisterUnit(new Array(32)),
        memory: new MemoryUnit(32, 1024),
        pc: 0,
    });

    const decodeInstruction = (instruction: number) => {
        const processor = new MIPSv6Processor();
        return processor.decode(instruction, createContext());
    };

    // R-type instructions use opcode=0 and distinguish operations through funct/shamt.
    describe("R-type instruction decoding", () => {
        it("decodes ADD (0x01294820) with the expected fields", () => {
            const decoded = decodeInstruction(0x01294820);

            expect(decoded.op).toBe("ADD");
            expect(decoded.type).toBe("R");
            expect(decoded.operand1).toBe(registers.t1);
            expect(decoded.operand2).toBe(registers.t1);
            expect(decoded.target).toBe(registers.t1);
        });

        it("decodes SUB (0x016B6022) as SUB", () => {
            const decoded = decodeInstruction(0x016b6022);

            expect(decoded.op).toBe("SUB");
            expect(decoded.operand1).toBe(registers.t3);
            expect(decoded.operand2).toBe(registers.t3);
            expect(decoded.target).toBe(registers.t4);
        });

        it("decodes AND, OR, XOR and NOR", () => {
            expect(decodeInstruction(0x01294824).op).toBe("AND");
            expect(decodeInstruction(0x01294825).op).toBe("OR");
            expect(decodeInstruction(0x01294826).op).toBe("XOR");
            expect(decodeInstruction(0x01294827).op).toBe("NOR");
        });

        it("decodes SLT", () => {
            const decoded = decodeInstruction(0x0129482a);

            expect(decoded.op).toBe("SLT");
            expect(decoded.operand1).toBe(registers.t1);
            expect(decoded.operand2).toBe(registers.t1);
            expect(decoded.target).toBe(registers.t1);
        });

        it("decodes NOP (0x00000000)", () => {
            expect(decodeInstruction(0x00000000).op).toBe("NOP");
        });

        it("decodes DIV and MOD using shamt to distinguish them", () => {
            expect(decodeInstruction(0x0000009a).op).toBe("DIV");
            expect(decodeInstruction(0x000000da).op).toBe("MOD");
        });

        it("decodes MUL and MUH using shamt to distinguish them", () => {
            expect(decodeInstruction(0x00000098).op).toBe("MUL");
            expect(decodeInstruction(0x000000d8).op).toBe("MUH");
        });
    });

    // I-type instructions encode a base register, a target register, and a 16-bit immediate.
    describe("I-type instruction decoding", () => {
        it("decodes ADDIU (0x25490001) and keeps the immediate", () => {
            const decoded = decodeInstruction(0x25490001);

            expect(decoded.op).toBe("ADDIU");
            expect(decoded.type).toBe("I");
            expect(decoded.operand1).toBe(registers.t2);
            expect(decoded.operand2).toBe(1);
            expect(decoded.target).toBe(registers.t1);
        });

        it("decodes ORI, ANDI, XORI and SLTI", () => {
            expect(decodeInstruction(0x34090005).op).toBe("ORI");
            expect(decodeInstruction(0x3148ffff).op).toBe("ANDI");
            expect(decodeInstruction(0x39080001).op).toBe("XORI");
            expect(decodeInstruction(0x29080010).op).toBe("SLTI");
        });

        it("decodes LW and SW with the correct base and offset", () => {
            expect(decodeInstruction(0x8d0b0000).op).toBe("LW");
            expect(decodeInstruction(0xad090000).op).toBe("SW");
        });

        it("decodes BEQ and BNE", () => {
            expect(decodeInstruction(0x11090002).op).toBe("BEQ");
            expect(decodeInstruction(0x15090001).op).toBe("BNE");
        });
    });

    // J-type instructions are used for unconditional jumps and compact branch targets.
    describe("J-type instruction decoding", () => {
        it("decodes J (0x08000006)", () => {
            const decoded = decodeInstruction(0x08000006);

            expect(decoded.op).toBe("J");
            expect(decoded.type).toBe("J");
            expect(decoded.operand1).toBe(6);
        });

        it("decodes BC (0xC8000002)", () => {
            expect(decodeInstruction(0xc8000002).op).toBe("BC");
        });
    });

    // These tests exercise the low-level bit extraction helpers used by the decoder.
    describe("Extract bits helper", () => {
        it("extracts the lower 6 bits", () => {
            expect(extractBits(0xabcdef12, 0, 6)).toBe(0x12);
        });

        it("extracts the opcode from bits 26..31", () => {
            expect(extractBits(0xabcdef12, 26, 6)).toBe(0x2a);
        });

        it("returns the expected value for different ranges", () => {
            expect(extractBits(0x12345678, 4, 8)).toBe(0x67);
            expect(extractBits(0x12345678, 16, 8)).toBe(0x34);
        });

        it("handles the full-width case", () => {
            expect(extractBits(0, 0, 32)).toBe(0);
        });
    });

    // The decoder should return a normalized instruction object with the expected shape.
    describe("Instruction structure", () => {
        it("returns decoded instructions with op and generic fields", () => {
            const decoded = decodeInstruction(0x01294820);

            expect(decoded).toHaveProperty("op");
            expect(decoded).toHaveProperty("type");
            expect(decoded).toHaveProperty("operand1");
            expect(decoded).toHaveProperty("operand2");
            expect(decoded).toHaveProperty("target");
        });

        it("uses decodeByFormat to map fields for each format", () => {
            expect(decodeByFormat(0x01294820, R_TYPE)).toHaveProperty("rs", registers.t1);
            expect(decodeByFormat(0x25490001, I_TYPE)).toHaveProperty("rt", registers.t1);
            expect(decodeByFormat(0x08000006, J_TYPE)).toHaveProperty("immediate", 6);
        });
    });

    // Unknown instructions must fail fast with a descriptive message.
    describe("Error handling", () => {
        it("throws for an unknown instruction", () => {
            expect(() => decodeInstruction(0xffffffff)).toThrow(/Unknown instruction/);
        });

        it("includes opcode, funct and shamt in the error message", () => {
            expect(() => decodeInstruction(0xffffffff)).toThrow(/opcode 63, funct 63, shamt 31/);
        });
    });

    // These examples mirror the classroom-style programs used throughout the project.
    describe("Real classroom instructions", () => {
        it("decodes classroom examples from the project", () => {
            expect(decodeInstruction(0x25490001).op).toBe("ADDIU");
            expect(decodeInstruction(0x01294820).op).toBe("ADD");
            expect(decodeInstruction(0x00000000).op).toBe("NOP");
            expect(decodeInstruction(0x25290001).op).toBe("ADDIU");
            expect(decodeInstruction(0x2408000f).op).toBe("ADDIU");
        });
    });
});
