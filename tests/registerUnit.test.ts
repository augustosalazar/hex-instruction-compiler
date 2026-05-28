import RegisterUnit from "../src/core/hardware/RegisterUnit";

/**
 * Unit tests for the MIPS register file simulator.
 *
 * The RegisterUnit is tested as a 32-register MIPS register bank:
 * - Every register starts at 0.
 * - Register index 0 represents `$zero` and must remain immutable.
 * - Written values are stored as unsigned 32-bit integers through `>>> 0`.
 * - Normal read/write sequences must keep registers independent from each other.
 *
 * Some tests also document the current out-of-range behavior. The current
 * implementation does not validate register bounds, so reading an unwritten
 * invalid index returns `undefined`, while writing index 32 creates a value.
 */
describe("RegisterUnit", () => {
    let registers: RegisterUnit;

    beforeEach(() => {
        // Standard MIPS register file: 32 registers, including `$zero` at index 0.
        registers = new RegisterUnit(new Array(32));
    });

    /*
     * Construction behavior:
     * A new RegisterUnit must allocate one slot per register definition and
     * initialize all valid MIPS registers with zero.
     */
    describe("Initialization", () => {
        it("creates 32 registers initialized to 0", () => {
            for (let i = 0; i < 32; i++) {
                expect(registers.read(i)).toBe(0);
            }
        });

        it("has 32 readable registers after construction", () => {
            expect(registers.read(0)).toBe(0);
            expect(registers.read(31)).toBe(0);
            expect(registers.read(32)).toBeUndefined();
        });

        it("returns 0 when reading register zero", () => {
            expect(registers.read(0)).toBe(0);
        });

        it("returns 0 for any valid register before writes", () => {
            expect(registers.read(1)).toBe(0);
            expect(registers.read(15)).toBe(0);
            expect(registers.read(31)).toBe(0);
        });
    });

    /*
     * Read behavior:
     * Reads should be side-effect free, safe for valid indexes, and return the
     * latest stored unsigned value for non-zero registers.
     */
    describe("Reading registers", () => {
        it("always reads register zero as 0", () => {
            registers.write(0, 1234);

            expect(registers.read(0)).toBe(0);
        });

        it("reads registers 1 through 31 as 0 when they have not been written", () => {
            for (let i = 1; i < 32; i++) {
                expect(registers.read(i)).toBe(0);
            }
        });

        it("does not throw when reading valid register indexes", () => {
            for (let i = 0; i < 32; i++) {
                expect(() => registers.read(i)).not.toThrow();
            }
        });

        it("returns the written value when reading after a write", () => {
            registers.write(8, 255);

            expect(registers.read(8)).toBe(255);
        });
    });

    /*
     * Write behavior:
     * Writes to registers 1-31 update the selected register and normalize the
     * value to the unsigned 32-bit range used by MIPS register storage.
     */
    describe("Writing to registers", () => {
        it("writes 100 to a valid non-zero register", () => {
            registers.write(1, 100);

            expect(registers.read(1)).toBe(100);
        });

        it("writes 42 to a different valid register", () => {
            registers.write(5, 42);

            expect(registers.read(5)).toBe(42);
        });

        it("returns 42 after write(5, 42)", () => {
            registers.write(5, 42);

            expect(registers.read(5)).toBe(42);
        });

        it("stores 0xffffffff correctly", () => {
            registers.write(1, 0xffffffff);

            expect(registers.read(1)).toBe(0xffffffff);
        });

        it("converts -1 to unsigned 32-bit 0xffffffff", () => {
            registers.write(1, -1);

            expect(registers.read(1)).toBe(0xffffffff);
        });

        it("keeps only the low 32 bits of values larger than 32 bits", () => {
            registers.write(2, 0x100000000);

            expect(registers.read(2)).toBe(0);
        });

        it("overwrites the same register with the last written value", () => {
            registers.write(3, 10);
            registers.write(3, 20);

            expect(registers.read(3)).toBe(20);
        });
    });

    /*
     * `$zero` behavior:
     * MIPS register 0 is hardwired to zero. Any attempted write to index 0 must
     * be ignored, regardless of the value being written.
     */
    describe("Register zero special behavior", () => {
        it("does not change register zero after write(0, 100)", () => {
            registers.write(0, 100);

            expect(registers.read(0)).toBe(0);
        });

        it("always reads register zero as 0 after write(0, 999)", () => {
            registers.write(0, 999);

            expect(registers.read(0)).toBe(0);
        });

        it("does not change register zero after write(0, -1)", () => {
            registers.write(0, -1);

            expect(registers.read(0)).toBe(0);
        });

        it("keeps register zero immutable across multiple writes", () => {
            registers.write(0, 1);
            registers.write(0, 0xffffffff);
            registers.write(0, -2147483648);
            registers.write(1, 25);

            expect(registers.read(0)).toBe(0);
            expect(registers.read(1)).toBe(25);
        });
    });

    /*
     * Boundary behavior:
     * These cases exercise signed/unsigned limits and document how the class
     * currently behaves when an index is outside the 0-31 MIPS range.
     */
    describe("Edge cases and boundaries", () => {
        it("writes the maximum signed 32-bit value", () => {
            registers.write(31, 2147483647);

            expect(registers.read(31)).toBe(2147483647);
        });

        it("writes the maximum unsigned 32-bit value", () => {
            registers.write(31, 4294967295);

            expect(registers.read(31)).toBe(0xffffffff);
        });

        it("converts the minimum signed 32-bit value to its unsigned representation", () => {
            registers.write(10, -2147483648);

            expect(registers.read(10)).toBe(0x80000000);
        });

        it("writes zero to a non-zero register", () => {
            registers.write(15, 123);
            registers.write(15, 0);

            expect(registers.read(15)).toBe(0);
        });

        it("converts negative values to unsigned 32-bit values", () => {
            registers.write(5, -100);

            expect(registers.read(5)).toBe(4294967196);
        });

        it("returns undefined when reading an index above the register file", () => {
            expect(registers.read(32)).toBeUndefined();
        });

        it("returns undefined when reading a negative index that was not written", () => {
            expect(registers.read(-1)).toBeUndefined();
        });

        it("allows writing outside the valid range according to current implementation", () => {
            registers.write(32, 123);

            expect(registers.read(32)).toBe(123);
        });
    });

    /*
     * State interaction:
     * These tests check that repeated writes, writes to all registers, and
     * updates to one register do not corrupt unrelated register values.
     */
    describe("Multiple operations", () => {
        it("writes and reads two different registers independently", () => {
            registers.write(1, 10);
            registers.write(2, 20);

            expect(registers.read(1)).toBe(10);
            expect(registers.read(2)).toBe(20);
        });

        it("overwrites values and keeps only the latest one", () => {
            registers.write(5, 100);
            registers.write(5, 200);

            expect(registers.read(5)).toBe(200);
        });

        it("writes to all valid non-zero registers and verifies each value", () => {
            for (let i = 1; i < 32; i++) {
                registers.write(i, i * 10);
            }

            for (let i = 1; i < 32; i++) {
                expect(registers.read(i)).toBe(i * 10);
            }
            expect(registers.read(0)).toBe(0);
        });

        it("keeps registers independent when one register changes", () => {
            registers.write(4, 44);
            registers.write(6, 66);
            registers.write(4, 444);

            expect(registers.read(4)).toBe(444);
            expect(registers.read(6)).toBe(66);
            expect(registers.read(5)).toBe(0);
        });
    });
});
