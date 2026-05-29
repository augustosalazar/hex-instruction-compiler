import {
    MIPSv6Processor,
    RegisterUnit,
    MemoryUnit,
    parseHexProgram,
    ExecutionContext,
    mipsv6Registers as registers,
    Program,
    singleCycleRun,
    pipelineRun,
    pipelineHazardRun,
} from "../src/index";

/**
 * Detailed hazard-focused pipeline tests.
 *
 * `pipeline.test.ts` checks that the basic and hazard-aware pipeline runners work
 * for broad program scenarios. This file complements it by isolating specific
 * hazard classes and verifying how `pipelineHazardRun()` resolves them:
 * - RAW data hazards through EX/MEM and MEM/WB forwarding.
 * - Load-use hazards through one-cycle stall bubbles.
 * - Control hazards through flushes after taken branches and jumps.
 * - Mixed data/control cases where forwarded values affect branch decisions.
 * - Architectural consistency against `singleCycleRun()`.
 *
 * The tests intentionally inspect both final architectural state and
 * `pipelineStates` metadata (`stall` and `flush`) so the suite validates not
 * only the final answer, but also the hazard mechanism used to reach it.
 */

// Standard context for low-address programs: 32 MIPS registers and 1024 words.
function makeCtx(): {
    processor: MIPSv6Processor;
    regUnit: RegisterUnit;
    memUnit: MemoryUnit;
    ctx: ExecutionContext;
} {
    const processor = new MIPSv6Processor();
    const regUnit = new RegisterUnit(new Array(32));
    const memUnit = new MemoryUnit(32, 1024);
    const ctx: ExecutionContext = { registers: regUnit, memory: memUnit, pc: 0 };
    return { processor, regUnit, memUnit, ctx };
}

// Larger memory context for programs that access addresses such as 0x1000.
function makeLargeMemCtx(): {
    processor: MIPSv6Processor;
    regUnit: RegisterUnit;
    memUnit: MemoryUnit;
    ctx: ExecutionContext;
} {
    const processor = new MIPSv6Processor();
    const regUnit = new RegisterUnit(new Array(32));
    const memUnit = new MemoryUnit(32, 10000);
    const ctx: ExecutionContext = { registers: regUnit, memory: memUnit, pc: 0 };
    return { processor, regUnit, memUnit, ctx };
}

// Reference runner: sequential execution is used as the architectural oracle.
function runSingle(program: Program, largeMemory = false) {
    const env = largeMemory ? makeLargeMemCtx() : makeCtx();
    const output = singleCycleRun(env.processor, program, env.ctx);
    return { ...env, output };
}

// Runner under test: full hazard-aware pipeline.
function runHazard(program: Program, largeMemory = false) {
    const env = largeMemory ? makeLargeMemCtx() : makeCtx();
    const output = pipelineHazardRun(env.processor, program, env.ctx);
    return { ...env, output };
}

// Basic pipeline without hazard protection, useful for comparison cases.
function runBasic(program: Program, largeMemory = false) {
    const env = largeMemory ? makeLargeMemCtx() : makeCtx();
    const output = pipelineRun(env.processor, program, env.ctx);
    return { ...env, output };
}

// Compares the MIPS architectural register file between two executions.
function expectRegisterRangeEqual(actual: RegisterUnit, expected: RegisterUnit, from = 0, to = 31) {
    for (let i = from; i <= to; i++) {
        expect(actual.read(i)).toBe(expected.read(i));
    }
}

// Pipeline metadata helpers: the hazard runner records these per cycle.
function hasStall(output: ReturnType<typeof pipelineHazardRun>): boolean {
    return output.pipelineStates?.some(state => state.stall) ?? false;
}

function hasFlush(output: ReturnType<typeof pipelineHazardRun>): boolean {
    return output.pipelineStates?.some(state => state.flush) ?? false;
}

describe("Pipeline Hazard Detection and Resolution", () => {
    /*
     * RAW hazards:
     * These cases prove dependent ALU instructions receive fresh producer values
     * through forwarding instead of reading stale register-file contents.
     */
    describe("Data Hazards (RAW - Read After Write)", () => {
        it("should correctly forward ALU result to next instruction (EX/MEM->EX)", () => {
            const program = parseHexProgram("24080005 01084820");
            const ref = runSingle(program);
            const haz = runHazard(program);

            expect(haz.regUnit.read(registers.t0)).toBe(5);
            expect(haz.regUnit.read(registers.t1)).toBe(10);
            expectRegisterRangeEqual(haz.regUnit, ref.regUnit);
        });

        it("should forward multiple sources in single instruction", () => {
            const program = parseHexProgram("24080005 24090007 01095020");
            const ref = runSingle(program);
            const haz = runHazard(program);

            expect(haz.regUnit.read(registers.t2)).toBe(12);
            expectRegisterRangeEqual(haz.regUnit, ref.regUnit);
        });

        it("should handle deep forward chain (4+ dependent instructions)", () => {
            const program = parseHexProgram("24080002 01084820 01295020 014A5820 016B6020");
            const ref = runSingle(program);
            const haz = runHazard(program);

            expect(haz.regUnit.read(registers.t0)).toBe(2);
            expect(haz.regUnit.read(registers.t1)).toBe(4);
            expect(haz.regUnit.read(registers.t2)).toBe(8);
            expect(haz.regUnit.read(registers.t3)).toBe(16);
            expect(haz.regUnit.read(registers.t4)).toBe(32);
            expectRegisterRangeEqual(haz.regUnit, ref.regUnit);
        });
    });

    /*
     * LW-use hazards:
     * Loaded data is not available early enough for the immediately following EX
     * stage, so the hazard unit must insert a bubble before forwarding the value.
     */
    describe("Load-Use Hazards (LW-USE)", () => {
        it("should insert 1 stall cycle for LW-USE hazard", () => {
            const program = parseHexProgram("34081000 3409002A AD090000 8D0A0000 014A5820");
            const ref = runSingle(program, true);
            const haz = runHazard(program, true);

            expect(hasStall(haz.output)).toBe(true);
            expect(haz.regUnit.read(registers.t2)).toBe(42);
            expect(haz.regUnit.read(registers.t3)).toBe(84);
            expect(haz.memUnit.read(0x1000)).toBe(42);
            expectRegisterRangeEqual(haz.regUnit, ref.regUnit);
        });

        it("should NOT stall if instruction after LW does not use loaded value", () => {
            const program = parseHexProgram("8D280000 00000000 016C5020");
            const env = makeCtx();
            env.regUnit.write(registers.t1, 32);
            env.regUnit.write(registers.t3, 11);
            env.regUnit.write(registers.t4, 22);
            env.memUnit.write(32, 99);

            const output = pipelineHazardRun(env.processor, program, env.ctx);

            expect(hasStall(output)).toBe(false);
            expect(env.regUnit.read(registers.t0)).toBe(99);
            expect(env.regUnit.read(registers.t2)).toBe(33);
        });

        it("should correctly forward LW result after stall to subsequent instructions", () => {
            const program = parseHexProgram("8D280000 01084820 01295020");
            const ref = makeCtx();
            ref.regUnit.write(registers.t1, 64);
            ref.memUnit.write(64, 21);
            singleCycleRun(ref.processor, program, ref.ctx);

            const haz = makeCtx();
            haz.regUnit.write(registers.t1, 64);
            haz.memUnit.write(64, 21);
            const output = pipelineHazardRun(haz.processor, program, haz.ctx);

            expect(hasStall(output)).toBe(true);
            expect(haz.regUnit.read(registers.t0)).toBe(21);
            expect(haz.regUnit.read(registers.t1)).toBe(42);
            expect(haz.regUnit.read(registers.t2)).toBe(84);
            expectRegisterRangeEqual(haz.regUnit, ref.regUnit);
        });
    });

    /*
     * Control hazards:
     * Branches and jumps can redirect the PC after younger instructions have
     * entered the pipeline. These tests verify the required flush behavior.
     */
    describe("Control Hazards (Branches & Jumps)", () => {
        it("should flush pipeline on branch taken", () => {
            const program = parseHexProgram("34080005 34090005 11090002 240A0001 240A0002 240B0003");
            const ref = runSingle(program);
            const haz = runHazard(program);

            expect(hasFlush(haz.output)).toBe(true);
            expect(haz.regUnit.read(registers.t2)).toBe(ref.regUnit.read(registers.t2));
            expect(haz.regUnit.read(registers.t3)).toBe(3);
        });

        it("should flush pipeline on jump taken", () => {
            const program = parseHexProgram("08000001 24080001 24080002 24080003 24090009");
            const ref = runSingle(program);
            const haz = runHazard(program);

            expect(hasFlush(haz.output)).toBe(true);
            expect(haz.regUnit.read(registers.t0)).toBe(ref.regUnit.read(registers.t0));
            expect(haz.regUnit.read(registers.t1)).toBe(9);
        });

        it("should not flush pipeline on branch not taken", () => {
            const program = parseHexProgram("34080005 34090006 11090002 240A0001 240A0002");
            const haz = runHazard(program);

            expect(hasFlush(haz.output)).toBe(false);
            expect(haz.regUnit.read(registers.t2)).toBe(2);
        });

        it("should handle delay slot correctly with flush", () => {
            const program = parseHexProgram("34080005 34090005 11090002 254A0001 254A0001 340B0003");
            const haz = runHazard(program);

            expect(hasFlush(haz.output)).toBe(true);
            expect(haz.regUnit.read(registers.t2)).toBe(1);
            expect(haz.regUnit.read(registers.t3)).toBe(3);
        });
    });

    /*
     * Combined hazards:
     * Branch decisions can depend on recently produced or loaded values, so
     * forwarding/stalling and flush logic must cooperate.
     */
    describe("Combined Hazards (Data + Control)", () => {
        it("should handle data dependency before branch", () => {
            const program = parseHexProgram("24080005 24090005 00000000 11090002 240A0001 240A0002 240B0003");
            const ref = runSingle(program);
            const haz = runHazard(program);

            expect(hasFlush(haz.output)).toBe(true);
            expectRegisterRangeEqual(haz.regUnit, ref.regUnit);
        });

        it("should handle load followed by branch", () => {
            const program = parseHexProgram("8D280000 240A0000 110A0002 240B0001 240B0002 240C0003");
            const ref = makeCtx();
            ref.regUnit.write(registers.t1, 32);
            ref.memUnit.write(32, 0);
            singleCycleRun(ref.processor, program, ref.ctx);

            const haz = makeCtx();
            haz.regUnit.write(registers.t1, 32);
            haz.memUnit.write(32, 0);
            const output = pipelineHazardRun(haz.processor, program, haz.ctx);

            expect(hasFlush(output)).toBe(true);
            expect(haz.regUnit.read(registers.t0)).toBe(0);
            expectRegisterRangeEqual(haz.regUnit, ref.regUnit);
        });
    });

    /*
     * Resource interaction:
     * These tests keep memory access sequences correct while instructions overlap
     * in the pipeline.
     */
    describe("Structural Hazards (Resource conflicts)", () => {
        it("should handle memory port contention gracefully", () => {
            const program = parseHexProgram("34080020 3409000A 340A0005 AD090000 AD0A0004 8D0B0000 8D0C0004");
            const ref = runSingle(program);
            const haz = runHazard(program);

            expect(haz.memUnit.read(0x20)).toBe(10);
            expect(haz.memUnit.read(0x24)).toBe(5);
            expect(haz.regUnit.read(registers.t3)).toBe(10);
            expect(haz.regUnit.read(registers.t4)).toBe(5);
            expectRegisterRangeEqual(haz.regUnit, ref.regUnit);
        });
    });

    /*
     * Detection accuracy:
     * The hazard unit must identify real producers and consumers without treating
     * `$zero`, stores, branches, or irrelevant writeback values as false hazards.
     */
    describe("Hazard Detection Accuracy", () => {
        it("should NOT forward from Write-back stage if not needed", () => {
            const program = parseHexProgram("24080005 00000000 00000000 01084820");
            const haz = runHazard(program);

            expect(haz.regUnit.read(registers.t1)).toBe(10);
            expect(hasStall(haz.output)).toBe(false);
        });

        it("should correctly identify register destinations", () => {
            const program = parseHexProgram("24080005 AD080020 24090007 01095020");
            const ref = runSingle(program);
            const haz = runHazard(program);

            expect(haz.regUnit.read(registers.t2)).toBe(12);
            expectRegisterRangeEqual(haz.regUnit, ref.regUnit);
        });

        it("should exclude $zero from hazard analysis", () => {
            const program = parseHexProgram("240003E7 00094820 00095020");
            const haz = runHazard(program);

            expect(haz.regUnit.read(0)).toBe(0);
            expect(haz.regUnit.read(registers.t1)).toBe(0);
            expect(haz.regUnit.read(registers.t2)).toBe(0);
            expect(hasStall(haz.output)).toBe(false);
        });
    });

    /*
     * Cycle impact:
     * Stalls cost cycles, but they preserve correctness. These cases compare
     * hazard-free and hazard-heavy execution.
     */
    describe("Cycle Count Impact of Hazards", () => {
        it("should report more cycles when stalls are inserted", () => {
            const noHazard = parseHexProgram("24080001 24090002 240A0003 240B0004");
            const withLoadUse = parseHexProgram("8D280000 01085020");

            const noHaz = runHazard(noHazard);
            const haz = makeCtx();
            haz.regUnit.write(registers.t1, 32);
            haz.memUnit.write(32, 10);
            const out = pipelineHazardRun(haz.processor, withLoadUse, haz.ctx);

            expect(hasStall(out)).toBe(true);
            expect(out.cycles).toBeGreaterThan(withLoadUse.instructions.length + 4);
            expect(noHaz.output.cycles).toBe(noHazard.instructions.length + 4);
        });

        it("should show performance improvement of hazard detection", () => {
            const program = parseHexProgram("24080005 01084820 01295020");
            const basic = runBasic(program);
            const haz = runHazard(program);
            const ref = runSingle(program);

            expect(basic.regUnit.read(registers.t2)).not.toBe(ref.regUnit.read(registers.t2));
            expect(haz.regUnit.read(registers.t2)).toBe(ref.regUnit.read(registers.t2));
            expect(haz.output.cycles).toBeGreaterThanOrEqual(basic.output.cycles ?? 0);
        });
    });

    /*
     * Classroom programs:
     * Full programs with memory and control hazards should still match the
     * sequential architectural result.
     */
    describe("Classroom Programs with Hazards", () => {
        it("should correctly execute simpleRamLwSwSolved with hazard protection", () => {
            const program = parseHexProgram(
                "34081000 3409000A 340A0005 AD090000 AD0A0004 8D0B0000 8D0C0004 016C6821 016C7023 016C7899 016CC0D9 AD0D0008 AD0E000C 8D190008 03296824 032A7025 01AE7826 032CC09B 032CC8DB 31EF00FF"
            );
            const ref = runSingle(program, true);
            const haz = runHazard(program, true);

            expectRegisterRangeEqual(haz.regUnit, ref.regUnit);
            expect(haz.memUnit.read(0x1000)).toBe(10);
            expect(haz.memUnit.read(0x1004)).toBe(5);
            expect(haz.memUnit.read(0x1008)).toBe(15);
            expect(haz.memUnit.read(0x100c)).toBe(5);
            expect(haz.output.cycles).toBeGreaterThan(program.instructions.length);
        });

        it("should correctly execute simpleRamBranchJump with hazard-aware control flow", () => {
            const program = parseHexProgram(
                "34080005 34090005 340A0000 " +
                "11090002 254A0001 254A0001 " +
                "340B0001 15090001 254A0001 340C0002 240DFFFF " +
                "5C0D0002 254A0001 340E0003 340E0009 " +
                "5C0E0001 254A0001 340FAAAA 05600001 254A0001 340F5555 " +
                "C8000002 CBFFFFE9 C8000002 34181111 C8000001 34192222 34183333"
            );
            const haz = runHazard(program);

            expect(haz.regUnit.read(registers.t2)).toBe(4);
            expect(haz.regUnit.read(registers.t9)).toBe(0);
            expect(haz.regUnit.read(registers.t8)).toBe(0x3333);
            expect(hasFlush(haz.output)).toBe(true);
        });
    });

    /*
     * Forwarding paths:
     * These cases separate one-cycle and two-cycle producer/consumer distances.
     */
    describe("Forwarding Paths in Detail", () => {
        it("should forward from EX/MEM stage (1 cycle latency)", () => {
            const program = parseHexProgram("2408000A 01084820");
            const haz = runHazard(program);

            expect(haz.regUnit.read(registers.t1)).toBe(20);
        });

        it("should forward from MEM/WB stage (2+ cycle latency)", () => {
            const program = parseHexProgram("2408000A 00000000 01084820 01085020");
            const haz = runHazard(program);

            expect(haz.regUnit.read(registers.t1)).toBe(20);
            expect(haz.regUnit.read(registers.t2)).toBe(20);
        });

        it("should NOT forward from write-back if value already in file", () => {
            const program = parseHexProgram("2408000A 00000000 00000000 00000000 01084820");
            const haz = runHazard(program);

            expect(haz.regUnit.read(registers.t1)).toBe(20);
            expect(hasStall(haz.output)).toBe(false);
        });
    });

    /*
     * Stall placement:
     * The suite validates the observable bubble count through pipeline snapshots.
     */
    describe("Stall Insertion Points", () => {
        it("should insert stall as NOP bubble in pipeline", () => {
            const program = parseHexProgram("8D280000 01085020");
            const haz = makeCtx();
            haz.regUnit.write(registers.t1, 32);
            haz.memUnit.write(32, 7);
            const output = pipelineHazardRun(haz.processor, program, haz.ctx);

            expect(output.pipelineStates?.filter(state => state.stall).length).toBe(1);
            expect(haz.regUnit.read(registers.t2)).toBe(14);
        });

        it("should not stall unnecessarily", () => {
            const program = parseHexProgram("24080001 24090002 240A0003 240B0004");
            const haz = runHazard(program);

            expect(hasStall(haz.output)).toBe(false);
            expect(haz.output.cycles).toBe(program.instructions.length + 4);
        });

        it("should handle multiple stalls in sequence", () => {
            const program = parseHexProgram("8D280000 01085020 8D2B0004 016B6020");
            const haz = makeCtx();
            haz.regUnit.write(registers.t1, 32);
            haz.memUnit.write(32, 7);
            haz.memUnit.write(36, 9);
            const output = pipelineHazardRun(haz.processor, program, haz.ctx);

            expect(output.pipelineStates?.filter(state => state.stall).length).toBe(2);
            expect(haz.regUnit.read(registers.t2)).toBe(14);
            expect(haz.regUnit.read(registers.t4)).toBe(18);
        });
    });

    /*
     * Edge cases:
     * These instructions stress unusual producer/consumer shapes and make sure
     * the hazard unit only tracks real register operands.
     */
    describe("Edge Cases in Hazard Detection", () => {
        it("should handle self-dependency (instruction reads its own destination)", () => {
            const program = parseHexProgram("24080005 24090003 01094020 01084820");
            const haz = runHazard(program);

            expect(haz.regUnit.read(registers.t0)).toBe(8);
            expect(haz.regUnit.read(registers.t1)).toBe(16);
        });

        it("should handle immediate operands (no register source)", () => {
            const program = parseHexProgram("24080005 2509002A");
            const haz = runHazard(program);

            expect(haz.regUnit.read(registers.t1)).toBe(47);
        });

        it("should handle instructions with no register sources", () => {
            const program = parseHexProgram("08000001 24080001 24080002 24080003 24090009");
            const haz = runHazard(program);

            expect(hasStall(haz.output)).toBe(false);
            expect(haz.regUnit.read(registers.t1)).toBe(9);
        });

        it("should handle instructions with no destination register", () => {
            const program = parseHexProgram("AC080020 01084820");
            const haz = makeCtx();
            haz.regUnit.write(registers.t0, 5);
            const output = pipelineHazardRun(haz.processor, program, haz.ctx);

            expect(hasStall(output)).toBe(false);
            expect(haz.memUnit.read(0x20)).toBe(5);
            expect(haz.regUnit.read(registers.t1)).toBe(10);
        });
    });

    /*
     * Architectural consistency:
     * The hazard-aware pipeline may take different cycles, but registers and
     * memory must match the sequential runner.
     */
    describe("Consistency: pipelineHazardRun vs singleCycleRun", () => {
        it("should produce IDENTICAL registers for any program", () => {
            const program = parseHexProgram("24080003 24090004 01095020 01485820 016B6020");
            const ref = runSingle(program);
            const haz = runHazard(program);

            expectRegisterRangeEqual(haz.regUnit, ref.regUnit);
        });

        it("should produce IDENTICAL memory for programs with LW/SW", () => {
            const program = parseHexProgram("34080020 34090011 340A0022 AD090000 AD0A0004 8D0B0000 8D0C0004");
            const ref = runSingle(program);
            const haz = runHazard(program);

            expect(haz.memUnit.read(0x20)).toBe(ref.memUnit.read(0x20));
            expect(haz.memUnit.read(0x24)).toBe(ref.memUnit.read(0x24));
            expectRegisterRangeEqual(haz.regUnit, ref.regUnit);
        });
    });

    /*
     * Performance characterization:
     * These tests document expected IPC differences between clean and stalled
     * pipeline execution.
     */
    describe("Performance Characterization", () => {
        it("should achieve near-peak IPC with hazard-free code", () => {
            const program = parseHexProgram("24080001 24090002 240A0003 240B0004 240C0005 240D0006");
            const haz = runHazard(program);
            const ipc = program.instructions.length / (haz.output.cycles ?? 1);

            expect(hasStall(haz.output)).toBe(false);
            expect(haz.output.cycles).toBe(program.instructions.length + 4);
            expect(ipc).toBeGreaterThan(0.5);
        });

        it("should degrade IPC gracefully with hazards", () => {
            const program = parseHexProgram("8D280000 01085020 8D2B0004 016B6020");
            const haz = makeCtx();
            haz.regUnit.write(registers.t1, 32);
            haz.memUnit.write(32, 7);
            haz.memUnit.write(36, 9);
            const output = pipelineHazardRun(haz.processor, program, haz.ctx);
            const ipc = program.instructions.length / (output.cycles ?? 1);

            expect(hasStall(output)).toBe(true);
            expect(ipc).toBeLessThan(0.5);
            expect(haz.regUnit.read(registers.t2)).toBe(14);
            expect(haz.regUnit.read(registers.t4)).toBe(18);
        });
    });
});
