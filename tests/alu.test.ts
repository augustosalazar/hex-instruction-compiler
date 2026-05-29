import ALU from "../src/core/hardware/alu";

/**
 * Unit tests for the MIPS v6 ALU implementation.
 *
 * These tests validate the ALU as a 32-bit execution unit:
 * - Signed operations interpret operands with JavaScript's `| 0` semantics.
 * - Unsigned operations interpret operands with `>>> 0` semantics.
 * - Multiplication tests distinguish low 32-bit results from high 32-bit results.
 * - Division and modulo tests assert MIPS-like truncation toward zero and zero-division errors.
 * - Logical operations assert raw bit behavior, including values that JavaScript displays as signed.
 *
 * Numeric constants such as 0xffffffff and 0x80000000 are intentionally used to make
 * boundary behavior explicit and easy to compare with MIPS register values.
 */
describe("ALU Operations", () => {
    /*
     * Signed arithmetic:
     * These operations coerce operands to signed 32-bit integers before executing.
     * Overflow is expected to wrap according to the lower 32 bits of the result.
     */
    describe("Signed arithmetic operations", () => {
        describe("add", () => {
            it("adds positive numbers", () => {
                expect(ALU.add(2, 3)).toBe(5);
            });

            it("adds a negative and a positive number", () => {
                expect(ALU.add(-5, 3)).toBe(-2);
            });

            it("wraps signed positive overflow to 32 bits", () => {
                expect(ALU.add(0x7fffffff, 1)).toBe(-2147483648);
            });

            it("returns the same value when adding zero", () => {
                expect(ALU.add(-1, 0)).toBe(-1);
            });
        });

        describe("sub", () => {
            it("subtracts positive numbers", () => {
                expect(ALU.sub(10, 3)).toBe(7);
            });

            it("returns a negative result when subtracting a larger number", () => {
                expect(ALU.sub(3, 10)).toBe(-7);
            });

            it("subtracts negative numbers", () => {
                expect(ALU.sub(-10, -3)).toBe(-7);
            });

            it("wraps signed negative overflow to 32 bits", () => {
                expect(ALU.sub(-2147483648, 1)).toBe(2147483647);
            });
        });

        describe("mul", () => {
            it("multiplies positive numbers", () => {
                expect(ALU.mul(100, 100)).toBe(10000);
            });

            it("multiplies negative numbers", () => {
                expect(ALU.mul(-1, -1)).toBe(1);
            });

            it("multiplies numbers with opposite signs", () => {
                expect(ALU.mul(-12, 3)).toBe(-36);
            });

            it("truncates signed multiplication overflow to the low 32 bits", () => {
                expect(ALU.mul(2147483647, 2)).toBe(-2);
            });
        });

        describe("muh", () => {
            it("returns zero high bits for a small positive product", () => {
                expect(ALU.muh(100, 100)).toBe(0);
            });

            it("returns zero high bits for -1 multiplied by -1", () => {
                expect(ALU.muh(-1, -1)).toBe(0);
            });

            it("returns sign-extended high bits for a negative 64-bit product", () => {
                expect(ALU.muh(0x80000000, 2)).toBe(-1);
            });

            it("returns the high signed bits for a large positive product", () => {
                expect(ALU.muh(0x7fffffff, 2)).toBe(0);
            });
        });

        describe("div", () => {
            it("divides positive numbers and truncates toward zero", () => {
                expect(ALU.div(10, 3)).toBe(3);
            });

            it("divides negative numbers and truncates toward zero", () => {
                expect(ALU.div(-10, 3)).toBe(-3);
            });

            it("returns zero when zero is divided by a non-zero number", () => {
                expect(ALU.div(0, 5)).toBe(0);
            });

            it("throws when dividing by zero", () => {
                expect(() => ALU.div(10, 0)).toThrow("Division by zero");
            });
        });

        describe("mod", () => {
            it("returns the remainder for positive numbers", () => {
                expect(ALU.mod(10, 3)).toBe(1);
            });

            it("keeps the dividend sign for negative remainders", () => {
                expect(ALU.mod(-10, 3)).toBe(-1);
            });

            it("returns zero when zero is divided by a non-zero number", () => {
                expect(ALU.mod(0, 5)).toBe(0);
            });

            it("throws when taking modulo by zero", () => {
                expect(() => ALU.mod(10, 0)).toThrow("Division by zero");
            });
        });
    });

    /*
     * Unsigned arithmetic:
     * These operations treat the same 32-bit patterns as values from 0 to 2^32 - 1.
     * The assertions check that results remain inside the unsigned 32-bit range.
     */
    describe("Unsigned arithmetic operations", () => {
        describe("addu", () => {
            it("adds positive numbers as unsigned values", () => {
                expect(ALU.addu(2, 3)).toBe(5);
            });

            it("treats -1 as 0xffffffff", () => {
                expect(ALU.addu(-1, 0)).toBe(0xffffffff);
            });

            it("wraps unsigned overflow to 32 bits", () => {
                expect(ALU.addu(0xffffffff, 1)).toBe(0);
            });

            it("wraps the maximum unsigned sum to 32 bits", () => {
                expect(ALU.addu(0xffffffff, 0xffffffff)).toBe(0xfffffffe);
            });
        });

        describe("subu", () => {
            it("subtracts positive numbers as unsigned values", () => {
                expect(ALU.subu(10, 3)).toBe(7);
            });

            it("wraps unsigned underflow to 32 bits", () => {
                expect(ALU.subu(0, 1)).toBe(0xffffffff);
            });

            it("subtracts from the maximum unsigned value", () => {
                expect(ALU.subu(0xffffffff, 1)).toBe(0xfffffffe);
            });

            it("returns zero when both unsigned operands are equal", () => {
                expect(ALU.subu(-1, 0xffffffff)).toBe(0);
            });
        });

        describe("mulu", () => {
            it("multiplies positive numbers as unsigned values", () => {
                expect(ALU.mulu(100, 100)).toBe(10000);
            });

            it("treats -1 as 0xffffffff and truncates low 32 bits", () => {
                expect(ALU.mulu(-1, 2)).toBe(0xfffffffe);
            });

            it("returns one for the low 32 bits of 0xffffffff squared", () => {
                expect(ALU.mulu(0xffffffff, 0xffffffff)).toBe(1);
            });

            it("returns zero for overflow when 0x80000000 is multiplied by two", () => {
                expect(ALU.mulu(0x80000000, 2)).toBe(0);
            });
        });

        describe("mulhu", () => {
            it("returns zero high bits for a small unsigned product", () => {
                expect(ALU.mulhu(100, 100)).toBe(0);
            });

            it("returns high bits for max unsigned multiplied by two", () => {
                expect(ALU.mulhu(0xffffffff, 2)).toBe(1);
            });

            it("returns high bits for 0xffffffff squared", () => {
                expect(ALU.mulhu(0xffffffff, 0xffffffff)).toBe(0xfffffffe);
            });

            it("returns high bits for 0x80000000 multiplied by two", () => {
                expect(ALU.mulhu(0x80000000, 2)).toBe(1);
            });
        });

        describe("divu", () => {
            it("divides positive numbers as unsigned values", () => {
                expect(ALU.divu(10, 3)).toBe(3);
            });

            it("treats -1 as 0xffffffff during division", () => {
                expect(ALU.divu(-1, 2)).toBe(2147483647);
            });

            it("returns zero when zero is divided by a non-zero number", () => {
                expect(ALU.divu(0, 5)).toBe(0);
            });

            it("throws when dividing by zero", () => {
                expect(() => ALU.divu(10, 0)).toThrow("Division by zero");
            });
        });

        describe("modu", () => {
            it("returns the unsigned remainder for positive numbers", () => {
                expect(ALU.modu(10, 3)).toBe(1);
            });

            it("treats -1 as 0xffffffff during modulo", () => {
                expect(ALU.modu(-1, 2)).toBe(1);
            });

            it("returns zero when zero is divided by a non-zero number", () => {
                expect(ALU.modu(0, 5)).toBe(0);
            });

            it("throws when taking modulo by zero", () => {
                expect(() => ALU.modu(10, 0)).toThrow("Division by zero");
            });
        });
    });

    /*
     * Logical operations:
     * JavaScript bitwise operators operate on signed 32-bit integers internally.
     * The expected values intentionally preserve that representation where needed,
     * for example 0xffffffff being observed as -1.
     */
    describe("Logical operations", () => {
        describe("and", () => {
            it("performs bitwise AND on basic bit patterns", () => {
                expect(ALU.and(0b1100, 0b1010)).toBe(0b1000);
            });

            it("returns zero when ANDing with zero", () => {
                expect(ALU.and(0xffffffff, 0)).toBe(0);
            });

            it("preserves the operand when ANDing with all ones", () => {
                expect(ALU.and(0x12345678, 0xffffffff)).toBe(0x12345678);
            });

            it("handles signed inputs at the bit level", () => {
                expect(ALU.and(-1, 0x7fffffff)).toBe(0x7fffffff);
            });
        });

        describe("or", () => {
            it("performs bitwise OR on basic bit patterns", () => {
                expect(ALU.or(0b1100, 0b1010)).toBe(0b1110);
            });

            it("returns the operand when ORing with zero", () => {
                expect(ALU.or(0x12345678, 0)).toBe(0x12345678);
            });

            it("returns all ones when ORing with 0xffffffff", () => {
                expect(ALU.or(0x12345678, 0xffffffff)).toBe(-1);
            });

            it("combines high-bit values as signed 32-bit results", () => {
                expect(ALU.or(0x80000000, 0x00000001)).toBe(-2147483647);
            });
        });

        describe("xor", () => {
            it("performs bitwise XOR on basic bit patterns", () => {
                expect(ALU.xor(0b1100, 0b1010)).toBe(0b0110);
            });

            it("returns the operand when XORing with zero", () => {
                expect(ALU.xor(0x12345678, 0)).toBe(0x12345678);
            });

            it("returns zero when XORing equal operands", () => {
                expect(ALU.xor(0xffffffff, -1)).toBe(0);
            });

            it("toggles every bit when XORing with all ones", () => {
                expect(ALU.xor(0x0000ffff, 0xffffffff)).toBe(-65536);
            });
        });

        describe("nor", () => {
            it("performs bitwise NOR on basic bit patterns", () => {
                expect(ALU.nor(0b1100, 0b1010)).toBe(~0b1110);
            });

            it("returns all ones when NORing zero with zero", () => {
                expect(ALU.nor(0, 0)).toBe(-1);
            });

            it("returns zero when either operand contains all ones", () => {
                expect(ALU.nor(0xffffffff, 0)).toBe(0);
            });

            it("handles high-bit inputs as signed 32-bit results", () => {
                expect(ALU.nor(0x80000000, 0)).toBe(0x7fffffff);
            });
        });
    });

    /*
     * Comparison operations:
     * `slt` compares signed interpretations of the operands.
     * `sltu` compares unsigned interpretations of the same bit patterns.
     */
    describe("Comparison operations", () => {
        describe("slt", () => {
            it("returns one when a positive signed value is less than another", () => {
                expect(ALU.slt(5, 10)).toBe(1);
            });

            it("returns zero when a positive signed value is greater than another", () => {
                expect(ALU.slt(10, 5)).toBe(0);
            });

            it("returns zero when signed values are equal", () => {
                expect(ALU.slt(5, 5)).toBe(0);
            });

            it("compares negative signed values correctly", () => {
                expect(ALU.slt(-5, -1)).toBe(1);
            });

            it("treats 0x80000000 as the minimum signed 32-bit value", () => {
                expect(ALU.slt(0x80000000, 0)).toBe(1);
            });
        });

        describe("sltu", () => {
            it("returns one when an unsigned value is less than another", () => {
                expect(ALU.sltu(5, 10)).toBe(1);
            });

            it("returns zero when an unsigned value is greater than another", () => {
                expect(ALU.sltu(10, 5)).toBe(0);
            });

            it("returns zero when unsigned values are equal", () => {
                expect(ALU.sltu(5, 5)).toBe(0);
            });

            it("treats -1 as the maximum unsigned 32-bit value", () => {
                expect(ALU.sltu(-1, 1)).toBe(0);
            });

            it("treats signed-negative bit patterns as large unsigned values", () => {
                expect(ALU.sltu(0x7fffffff, 0x80000000)).toBe(1);
            });
        });
    });
});
