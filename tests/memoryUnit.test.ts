import MemoryUnit from "../src/core/hardware/MemoryUnit";

/**
 * Unit tests for the MIPS memory unit simulator.
 *
 * The MemoryUnit is tested as a bounded 32-bit word-addressable memory:
 * - The constructor stores the configured word size and address count.
 * - Every address starts with value 0.
 * - Reads and writes are valid only inside the range [0, addresses - 1].
 * - Values are stored through Uint32Array, so they are normalized to unsigned 32-bit words.
 * - Writes to one address must not modify any other memory address.
 *
 * The `wordSize` and `addresses` properties are marked readonly in TypeScript.
 * These tests validate their public values instead of mutating them, because
 * TypeScript readonly is a compile-time contract rather than runtime freezing.
 */
describe("MemoryUnit", () => {
    let memory: MemoryUnit;

    beforeEach(() => {
        // Standard memory used by the processor tests: 32-bit words, 1024 addresses.
        memory = new MemoryUnit(32, 1024);
    });

    /*
     * Construction behavior:
     * A valid memory must preserve its configuration and initialize all words to 0.
     * Invalid address counts are rejected before the backing Uint32Array is created.
     */
    describe("Initialization", () => {
        it("creates memory with 32-bit words and 1024 addresses", () => {
            expect(memory.wordSize).toBe(32);
            expect(memory.addresses).toBe(1024);
        });

        it("stores wordSize as 32", () => {
            expect(memory.wordSize).toBe(32);
        });

        it("stores addresses as 1024", () => {
            expect(memory.addresses).toBe(1024);
        });

        it("initializes representative addresses to 0", () => {
            expect(memory.read(0)).toBe(0);
            expect(memory.read(100)).toBe(0);
            expect(memory.read(1023)).toBe(0);
        });

        it("initializes all addresses from 0 through 1023 to 0", () => {
            for (let address = 0; address < 1024; address++) {
                expect(memory.read(address)).toBe(0);
            }
        });

        it("throws when constructed with zero addresses", () => {
            expect(() => new MemoryUnit(32, 0)).toThrow("Memory must have at least one address");
        });

        it("throws when constructed with negative addresses", () => {
            expect(() => new MemoryUnit(32, -5)).toThrow("Memory must have at least one address");
        });
    });

    /*
     * Read behavior:
     * Reads are deterministic and bounded. Unwritten valid addresses return 0,
     * while negative or past-the-end addresses throw the expected bounds error.
     */
    describe("Reading from memory", () => {
        it("returns 0 when reading address 0 before writes", () => {
            expect(memory.read(0)).toBe(0);
        });

        it("returns 0 when reading address 100 before writes", () => {
            expect(memory.read(100)).toBe(0);
        });

        it("returns 0 when reading any valid unwritten address", () => {
            expect(memory.read(1)).toBe(0);
            expect(memory.read(512)).toBe(0);
            expect(memory.read(1023)).toBe(0);
        });

        it("returns the same value across multiple reads of the same address", () => {
            memory.write(250, 12345);

            expect(memory.read(250)).toBe(12345);
            expect(memory.read(250)).toBe(12345);
            expect(memory.read(250)).toBe(12345);
        });

        it("throws when reading an address below 0", () => {
            expect(() => memory.read(-1)).toThrow("Address out of bounds");
        });

        it("throws when reading address 1024 in a 1024-address memory", () => {
            expect(() => memory.read(1024)).toThrow("Address out of bounds");
        });

        it("throws when reading a far out-of-range address", () => {
            expect(() => memory.read(10000)).toThrow("Address out of bounds");
        });
    });

    /*
     * Write behavior:
     * Writes update exactly one valid address and Uint32Array normalizes the stored
     * value to the unsigned 32-bit range.
     */
    describe("Writing to memory", () => {
        it("writes to address 0", () => {
            memory.write(0, 100);

            expect(memory.read(0)).toBe(100);
        });

        it("writes to address 500", () => {
            memory.write(500, 42);

            expect(memory.read(500)).toBe(42);
        });

        it("returns 100 after write(0, 100)", () => {
            memory.write(0, 100);

            expect(memory.read(0)).toBe(100);
        });

        it("returns 42 after write(500, 42)", () => {
            memory.write(500, 42);

            expect(memory.read(500)).toBe(42);
        });

        it("stores 0xffffffff as an unsigned 32-bit value", () => {
            memory.write(10, 0xffffffff);

            expect(memory.read(10)).toBe(4294967295);
        });

        it("stores -1 as unsigned 32-bit 0xffffffff", () => {
            memory.write(10, -1);

            expect(memory.read(10)).toBe(0xffffffff);
        });

        it("keeps only the low 32 bits of values larger than 32 bits", () => {
            memory.write(10, 0x100000000);

            expect(memory.read(10)).toBe(0);
        });

        it("throws when writing to an address below 0", () => {
            expect(() => memory.write(-1, 100)).toThrow("Address out of bounds");
        });

        it("throws when writing to address 1024 in a 1024-address memory", () => {
            expect(() => memory.write(1024, 100)).toThrow("Address out of bounds");
        });

        it("throws when writing to a far out-of-range address", () => {
            expect(() => memory.write(10000, 100)).toThrow("Address out of bounds");
        });
    });

    /*
     * Address independence:
     * The memory array must behave like separate word slots. Updating one address
     * cannot leak into neighboring or distant addresses.
     */
    describe("Memory independence", () => {
        it("does not let a write to address 10 affect address 11", () => {
            memory.write(10, 999);

            expect(memory.read(10)).toBe(999);
            expect(memory.read(11)).toBe(0);
        });

        it("does not let a write to address 100 affect address 0", () => {
            memory.write(100, 555);

            expect(memory.read(100)).toBe(555);
            expect(memory.read(0)).toBe(0);
        });

        it("writes multiple addresses and reads each value independently", () => {
            memory.write(5, 10);
            memory.write(50, 20);
            memory.write(500, 30);

            expect(memory.read(5)).toBe(10);
            expect(memory.read(50)).toBe(20);
            expect(memory.read(500)).toBe(30);
        });

        it("overwrites an address with the latest value", () => {
            memory.write(10, 100);
            memory.write(10, 200);

            expect(memory.read(10)).toBe(200);
        });
    });

    /*
     * Boundary values:
     * These tests exercise the first and last legal addresses, signed/unsigned
     * 32-bit limits, zero writes, and negative-to-uint32 conversion.
     */
    describe("Edge cases and boundaries", () => {
        it("writes to the first valid address", () => {
            memory.write(0, 321);

            expect(memory.read(0)).toBe(321);
        });

        it("writes to the last valid address", () => {
            memory.write(1023, 999);

            expect(memory.read(1023)).toBe(999);
        });

        it("writes the maximum signed 32-bit value", () => {
            memory.write(0, 2147483647);

            expect(memory.read(0)).toBe(2147483647);
        });

        it("writes the maximum unsigned 32-bit value", () => {
            memory.write(0, 4294967295);

            expect(memory.read(0)).toBe(0xffffffff);
        });

        it("writes zero after a non-zero value", () => {
            memory.write(0, 123);
            memory.write(0, 0);

            expect(memory.read(0)).toBe(0);
        });

        it("converts the minimum signed 32-bit value to unsigned 32-bit", () => {
            memory.write(0, -2147483648);

            expect(memory.read(0)).toBe(0x80000000);
        });

        it("converts negative values to unsigned 32-bit values", () => {
            memory.write(10, -100);

            expect(memory.read(10)).toBe(4294967196);
        });
    });

    /*
     * Memory sizes:
     * The same contract should hold for minimal, small, and large memories. The
     * last legal address is always addresses - 1.
     */
    describe("Different memory sizes", () => {
        it("supports a memory with a single address", () => {
            const oneAddressMemory = new MemoryUnit(32, 1);

            oneAddressMemory.write(0, 100);

            expect(oneAddressMemory.read(0)).toBe(100);
            expect(() => oneAddressMemory.write(1, 100)).toThrow("Address out of bounds");
            expect(() => oneAddressMemory.read(1)).toThrow("Address out of bounds");
        });

        it("supports a memory with 10 addresses", () => {
            const tenAddressMemory = new MemoryUnit(32, 10);

            for (let address = 0; address < 10; address++) {
                tenAddressMemory.write(address, address + 100);
            }

            for (let address = 0; address < 10; address++) {
                expect(tenAddressMemory.read(address)).toBe(address + 100);
            }
            expect(() => tenAddressMemory.read(10)).toThrow("Address out of bounds");
            expect(() => tenAddressMemory.write(10, 1)).toThrow("Address out of bounds");
        });

        it("supports a large memory and its last valid address", () => {
            const largeMemory = new MemoryUnit(32, 10000);

            largeMemory.write(9999, 777);

            expect(largeMemory.read(9999)).toBe(777);
        });
    });

    /*
     * Public configuration:
     * These properties describe the memory shape used by the processor. They are
     * readonly at compile time, so this suite verifies their exposed values.
     */
    describe("Word size property", () => {
        it("exposes wordSize as 32 for a 32-bit memory", () => {
            expect(memory.wordSize).toBe(32);
        });

        it("exposes the constructor wordSize value", () => {
            const sixteenBitMemory = new MemoryUnit(16, 4);

            expect(sixteenBitMemory.wordSize).toBe(16);
        });

        it("exposes addresses as the constructor addresses value", () => {
            const smallMemory = new MemoryUnit(32, 5);

            expect(smallMemory.addresses).toBe(5);
        });
    });

    /*
     * Operation sequences:
     * These cases simulate common access patterns: adjacent writes, filling a
     * small memory, and repeated writes to the same address.
     */
    describe("Sequence operations", () => {
        it("writes sequential addresses and reads each value", () => {
            memory.write(0, 10);
            memory.write(1, 20);
            memory.write(2, 30);

            expect(memory.read(0)).toBe(10);
            expect(memory.read(1)).toBe(20);
            expect(memory.read(2)).toBe(30);
        });

        it("writes all addresses of a small memory and verifies each one", () => {
            const smallMemory = new MemoryUnit(32, 5);

            for (let address = 0; address < 5; address++) {
                smallMemory.write(address, (address + 1) * 11);
            }

            expect(smallMemory.read(0)).toBe(11);
            expect(smallMemory.read(1)).toBe(22);
            expect(smallMemory.read(2)).toBe(33);
            expect(smallMemory.read(3)).toBe(44);
            expect(smallMemory.read(4)).toBe(55);
        });

        it("keeps the latest value after sequential overwrites", () => {
            memory.write(5, 1);
            memory.write(5, 2);
            memory.write(5, 3);

            expect(memory.read(5)).toBe(3);
        });
    });
});
