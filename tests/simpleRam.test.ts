import {
    singleCycleRun,
    MIPSv6Processor,
    RegisterUnit,
    MemoryUnit,
    parseHexProgram,
    ExecutionContext,
    mipsv6Registers as registers
} from "../src/index";

describe("MIPSv6 Processor Execution", () => {
    it("should correctly execute the provided hex program", () => {
        // 1. Arrange: The program provided by the user (space-separated hex words)
        const hexProgram = "25490001 01294820 00000000 25290001 2408000F 240A000F 01295820 016B6020 018C6820";

        const program = parseHexProgram(hexProgram);
        console.log(program.instructions);
        const processor = new MIPSv6Processor();

        // MIPS has 32 registers
        const regUnit = new RegisterUnit(new Array(32));
        const memUnit = new MemoryUnit(32, 1024);

        const ctx: ExecutionContext = {
            registers: regUnit,
            memory: memUnit,
            pc: 0
        };

        // 2. Act: Run the simulation
        singleCycleRun(processor, program, ctx);

        // 3. Assert: Check if the registers match expected values
        expect(regUnit.read(registers.t0)).toBe(15);
        expect(regUnit.read(registers.t1)).toBe(3);
        expect(regUnit.read(registers.t2)).toBe(15);
        expect(regUnit.read(registers.t3)).toBe(6);
        expect(regUnit.read(registers.t4)).toBe(12);
        expect(regUnit.read(registers.t5)).toBe(24);

        console.log("====================================");
        console.log("FINAL REGISTER STATES:");
        console.log(`$t0 (reg ${registers.t0}) = ${regUnit.read(registers.t0)}`);
        console.log(`$t1 (reg ${registers.t1}) = ${regUnit.read(registers.t1)}`);
        console.log(`$t2 (reg ${registers.t2}) = ${regUnit.read(registers.t2)}`);
        console.log(`$t3 (reg ${registers.t3}) = ${regUnit.read(registers.t3)}`);
        console.log(`$t4 (reg ${registers.t4}) = ${regUnit.read(registers.t4)}`);
        console.log(`$t5 (reg ${registers.t5}) = ${regUnit.read(registers.t5)}`);
        console.log("====================================");
    });
});
