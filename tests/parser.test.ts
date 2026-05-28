import { parseHexProgram } from "../src/helpers/parser.helper";

/**
 * Unit tests for the hexadecimal program parser.
 *
 * The parser receives a string of MIPS v6 instructions written as hexadecimal
 * words and returns a Program object with numeric instructions. These tests
 * validate the parser independently from instruction execution:
 * - Whitespace is treated as a separator through the parser's /\s+/ split.
 * - Empty words are ignored after trimming and filtering.
 * - Hex words are converted with parseInt(..., 16).
 * - The final numeric value is normalized to unsigned 32 bits with >>> 0.
 * - Real classroom programs keep their instruction order and length.
 */
describe("parseHexProgram Parser", () => {
    /*
     * Basic parsing:
     * Covers the most common input shape: one or more 8-digit hex instructions
     * separated by regular spaces.
     */
    describe("Basic parsing", () => {
        it("parses a single simple instruction", () => {
            const program = parseHexProgram("25490001");

            expect(program.instructions).toEqual([0x25490001]);
        });

        it("parses multiple instructions separated by spaces", () => {
            const program = parseHexProgram("25490001 01294820 00000000");

            expect(program.instructions.length).toBe(3);
            expect(program.instructions[0]).toBe(0x25490001);
            expect(program.instructions[1]).toBe(0x01294820);
            expect(program.instructions[2]).toBe(0x00000000);
        });

        it("parses the complete simpleRAMSolved classroom program", () => {
            const program = parseHexProgram(
                "25490001 01294820 00000000 25290001 2408000F 240A000F 01295820 016B6020 018C6820"
            );

            expect(program.instructions).toEqual([
                0x25490001,
                0x01294820,
                0x00000000,
                0x25290001,
                0x2408000f,
                0x240a000f,
                0x01295820,
                0x016b6020,
                0x018c6820,
            ]);
        });
    });

    /*
     * Whitespace handling:
     * The parser should accept spaces, repeated spaces, tabs, line breaks, and
     * leading/trailing whitespace because all of them are matched by /\s+/.
     */
    describe("Whitespace handling", () => {
        it("handles single spaces", () => {
            const program = parseHexProgram("AAAA BBBB CCCC");

            expect(program.instructions).toEqual([0xaaaa, 0xbbbb, 0xcccc]);
        });

        it("handles multiple spaces between instructions", () => {
            const program = parseHexProgram("AAAA  BBBB   CCCC");

            expect(program.instructions).toEqual([0xaaaa, 0xbbbb, 0xcccc]);
        });

        it("handles tabs and line breaks", () => {
            const program = parseHexProgram("AAAA\tBBBB\nCCCC");

            expect(program.instructions).toEqual([0xaaaa, 0xbbbb, 0xcccc]);
        });

        it("handles leading and trailing spaces", () => {
            const program = parseHexProgram("  AAAA BBBB CCCC  ");

            expect(program.instructions.length).toBe(3);
            expect(program.instructions).toEqual([0xaaaa, 0xbbbb, 0xcccc]);
        });

        it("handles one instruction without extra spaces", () => {
            const program = parseHexProgram("12345678");

            expect(program.instructions).toEqual([0x12345678]);
        });
    });

    /*
     * Hexadecimal format:
     * These cases verify uppercase, lowercase, mixed-case, and the supported
     * lowercase 0x prefix used by parseHexProgram before calling parseInt.
     */
    describe("Hexadecimal format", () => {
        it("parses lowercase hexadecimal numbers", () => {
            const program = parseHexProgram("abcdef01");

            expect(program.instructions).toEqual([0xabcdef01]);
        });

        it("parses uppercase hexadecimal numbers", () => {
            const program = parseHexProgram("ABCDEF01");

            expect(program.instructions).toEqual([0xabcdef01]);
        });

        it("parses mixed-case hexadecimal numbers", () => {
            const program = parseHexProgram("AbCdEf01");

            expect(program.instructions).toEqual([0xabcdef01]);
        });

        it("parses hexadecimal numbers with 0x prefix", () => {
            const firstProgram = parseHexProgram("0x25490001");
            const secondProgram = parseHexProgram("0xABCDEF01");

            expect(firstProgram.instructions).toEqual([0x25490001]);
            expect(secondProgram.instructions).toEqual([0xabcdef01]);
        });

        it("parses multiple instructions with 0x prefix", () => {
            const program = parseHexProgram("0x25490001 0x01294820 0x00000000");

            expect(program.instructions).toEqual([0x25490001, 0x01294820, 0x00000000]);
        });

        it("parses instructions without 0x prefix", () => {
            const program = parseHexProgram("25490001 01294820 00000000");

            expect(program.instructions).toEqual([0x25490001, 0x01294820, 0x00000000]);
        });
    });

    /*
     * Unsigned 32-bit conversion:
     * The parser masks every parsed instruction with >>> 0, so values are kept
     * in the same unsigned range used by MIPS instruction words.
     */
    describe("32-bit unsigned conversion", () => {
        it("converts 0xffffffff to an unsigned 32-bit number", () => {
            const program = parseHexProgram("FFFFFFFF");

            expect(program.instructions[0]).toBe(4294967295);
        });

        it("truncates values larger than 32 bits to the low 32 bits", () => {
            const program = parseHexProgram("100000000");

            expect(program.instructions[0]).toBe(0);
        });

        it("parses the maximum unsigned 32-bit value", () => {
            const program = parseHexProgram("FFFFFFFF");

            expect(program.instructions[0]).toBe(0xffffffff);
        });

        it("parses zero with eight digits", () => {
            const program = parseHexProgram("00000000");

            expect(program.instructions[0]).toBe(0);
        });

        it("parses zero with one digit", () => {
            const program = parseHexProgram("0");

            expect(program.instructions[0]).toBe(0);
        });
    });

    /*
     * Edge cases:
     * Empty input should produce an empty Program, leading zeroes should not
     * change numeric values, and long programs should preserve every instruction.
     */
    describe("Edge cases", () => {
        it("returns an empty instruction array for an empty program", () => {
            const program = parseHexProgram("");

            expect(program.instructions).toEqual([]);
        });

        it("returns an empty instruction array for whitespace-only input", () => {
            const program = parseHexProgram("   ");

            expect(program.instructions).toEqual([]);
        });

        it("parses a single instruction", () => {
            const program = parseHexProgram("DEADBEEF");

            expect(program.instructions).toEqual([0xdeadbeef]);
        });

        it("parses more than 100 instructions", () => {
            const instructions = Array.from({ length: 128 }, (_, index) =>
                index.toString(16).padStart(8, "0")
            );
            const program = parseHexProgram(instructions.join(" "));

            expect(program.instructions.length).toBe(128);
            expect(program.instructions[0]).toBe(0);
            expect(program.instructions[64]).toBe(64);
            expect(program.instructions[127]).toBe(127);
        });

        it("parses instructions with leading zeroes", () => {
            const program = parseHexProgram("00000001 000ABCDE");

            expect(program.instructions).toEqual([1, 0x000abcde]);
        });
    });

    /*
     * Classroom examples:
     * These are representative programs from the project tests and class-style
     * exercises. They prove the parser accepts realistic instruction streams.
     */
    describe("Real classroom examples", () => {
        it("parses simpleRAMSolved with ADD and ADDIU instructions", () => {
            const program = parseHexProgram(
                "25490001 01294820 00000000 25290001 2408000F 240A000F 01295820 016B6020 018C6820"
            );

            expect(program.instructions.length).toBe(9);
            expect(program.instructions[0]).toBe(0x25490001);
            expect(program.instructions[8]).toBe(0x018c6820);
        });

        it("parses a simpleRamLwSwSolved-style memory program", () => {
            const program = parseHexProgram("24080064 AC080000 8C090000 AC090004 8C0A0004");

            expect(program.instructions).toEqual([
                0x24080064,
                0xac080000,
                0x8c090000,
                0xac090004,
                0x8c0a0004,
            ]);
        });

        it("parses the simpleRamBranchJumpResult branch and jump program", () => {
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

            expect(program.instructions.length).toBe(28);
            expect(program.instructions[0]).toBe(0x34080005);
            expect(program.instructions[10]).toBe(0x240dffff);
            expect(program.instructions[27]).toBe(0x34183333);
        });
    });

    /*
     * Program shape:
     * parseHexProgram must return the Program structure consumed by the rest of
     * the simulator: an object with an instructions array of integer numbers.
     */
    describe("Type checking", () => {
        it("returns an object with an instructions property", () => {
            const result = parseHexProgram("25490001");

            expect(result.instructions).toBeDefined();
            expect(Array.isArray(result.instructions)).toBe(true);
        });

        it("returns numbers for every instruction", () => {
            const result = parseHexProgram("25490001 01294820");

            result.instructions.forEach(instruction => {
                expect(typeof instruction).toBe("number");
            });
        });

        it("returns integer instructions", () => {
            const result = parseHexProgram("25490001 01294820 FFFFFFFF");

            result.instructions.forEach(instruction => {
                expect(Number.isInteger(instruction)).toBe(true);
            });
        });
    });

    /*
     * Special values:
     * NOP, all-ones words, and alternating patterns are common low-level values
     * where preserving exact unsigned 32-bit numbers matters.
     */
    describe("Special values", () => {
        it("parses NOP as zero", () => {
            const program = parseHexProgram("00000000");

            expect(program.instructions).toEqual([0]);
        });

        it("parses the maximum 32-bit unsigned value", () => {
            const program = parseHexProgram("FFFFFFFF");

            expect(program.instructions).toEqual([4294967295]);
        });

        it("keeps alternating high and low values in order", () => {
            const program = parseHexProgram("FFFFFFFF 00000000 FFFFFFFF 00000000");

            expect(program.instructions).toEqual([0xffffffff, 0, 0xffffffff, 0]);
        });
    });
});
