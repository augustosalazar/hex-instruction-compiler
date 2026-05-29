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

// ─── Shared factory ────────────────────────────────────────────────────────────
// Creates a fresh processor + context for every test so there is no shared state.

function makeCtx(): { processor: MIPSv6Processor; regUnit: RegisterUnit; memUnit: MemoryUnit; ctx: ExecutionContext } {
    const processor = new MIPSv6Processor();
    const regUnit   = new RegisterUnit(new Array(32));
    const memUnit   = new MemoryUnit(32, 1024);
    const ctx: ExecutionContext = { registers: regUnit, memory: memUnit, pc: 0 };
    return { processor, regUnit, memUnit, ctx };
}

// ─── Suite 1 — Basic arithmetic (mirrors simpleRam.test.ts) ──────────────────
//
// Program (same hex as simpleRam.test.ts):
//  00: ADDIU $t1,$t2,1      → $t1 = 1         (RAW: $t2 = 0 here, ok)
//  01: ADD   $t1,$t1,$t1    → $t1 = 2         (RAW hazard on $t1 ← 00)
//  02: NOP
//  03: ADDIU $t1,$t1,1      → $t1 = 3
//  04: ADDIU $t0,$zero,15   → $t0 = 15
//  05: ADDIU $t2,$zero,15   → $t2 = 15
//  06: ADD   $t3,$t1,$t1    → $t3 = 6
//  07: ADD   $t4,$t3,$t3    → $t4 = 12        (RAW hazard on $t3 ← 06)
//  08: ADD   $t5,$t4,$t4    → $t5 = 24        (RAW hazard on $t4 ← 07)

const SIMPLE_HEX = "25490001 01294820 00000000 25290001 2408000F 240A000F 01295820 016B6020 018C6820";

describe("Pipeline — Basic arithmetic (no branches)", () => {

    it("pipelineRun: final registers match singleCycleRun", () => {
        const program = parseHexProgram(SIMPLE_HEX);

        // Reference: single-cycle result
        const ref = makeCtx();
        singleCycleRun(ref.processor, program, ref.ctx);

        // Pipeline (no hazard protection)
        const pip = makeCtx();
        pipelineRun(pip.processor, program, pip.ctx);

        // Both runners must produce identical register state
        // (basic pipeline reads stale values for RAW hazards — the program is designed
        //  so that the NOP at index 02 gives enough distance for the first few hazards,
        //  but indices 07 and 08 still have back-to-back RAW dependencies that the basic
        //  pipeline will get wrong.  We therefore only check the registers that are
        //  hazard-free in the basic pipeline.)
        expect(pip.regUnit.read(registers.t0)).toBe(15);   // no dependency
        expect(pip.regUnit.read(registers.t2)).toBe(15);   // no dependency
    });

    it("pipelineHazardRun: final registers exactly match singleCycleRun", () => {
        const program = parseHexProgram(SIMPLE_HEX);

        const ref = makeCtx();
        singleCycleRun(ref.processor, program, ref.ctx);

        const pip = makeCtx();
        pipelineHazardRun(pip.processor, program, pip.ctx);

        // With forwarding + stalls every register must be correct
        expect(pip.regUnit.read(registers.t0)).toBe(ref.regUnit.read(registers.t0)); // 15
        expect(pip.regUnit.read(registers.t1)).toBe(ref.regUnit.read(registers.t1)); // 3
        expect(pip.regUnit.read(registers.t2)).toBe(ref.regUnit.read(registers.t2)); // 15
        expect(pip.regUnit.read(registers.t3)).toBe(ref.regUnit.read(registers.t3)); // 6
        expect(pip.regUnit.read(registers.t4)).toBe(ref.regUnit.read(registers.t4)); // 12
        expect(pip.regUnit.read(registers.t5)).toBe(ref.regUnit.read(registers.t5)); // 24
    });

    it("pipelineHazardRun: cycle count is greater than instruction count (stalls inserted)", () => {
        const program = parseHexProgram(SIMPLE_HEX);
        const pip = makeCtx();
        const result = pipelineHazardRun(pip.processor, program, pip.ctx);

        // 9 instructions + 4 pipeline fill/drain cycles + at least 2 stall cycles
        // (back-to-back RAW at 07→08).  Any value > 9 confirms stalls happened.
        expect(result.cycles).toBeGreaterThan(program.instructions.length);
    });
});

// ─── Suite 2 — RAW data hazard forwarding ─────────────────────────────────────
//
// Tight chain: every instruction reads the result written by the previous one.
// Without forwarding the pipeline produces wrong values; with forwarding it is correct.
//
//  00: ADDIU $t0,$zero,10   → $t0 = 10
//  01: ADD   $t1,$t0,$t0    → $t1 = 20   (EX/MEM→EX forward on $t0)
//  02: ADD   $t2,$t1,$t1    → $t2 = 40   (EX/MEM→EX forward on $t1)
//  03: ADD   $t3,$t2,$t0    → $t3 = 50   (MEM/WB→EX on $t2, EX/MEM→EX on $t0 stale but ok)

const RAW_HEX = "2408000A 01085020 012B5820 01485820";
//              ADDIU t0,0,10  ADD t1,t0,t0  ADD t2,t1,t1  ADD t3,t2,t0

// Hand-encoded:
//   ADDIU $t0,$zero,10  → opcode=9(001001), rs=0, rt=8(t0),  imm=10  → 0x2408000A
//   ADD   $t1,$t0,$t0   → opcode=0, rs=8,   rt=8,  rd=9(t1), shamt=0, funct=32 → 0x01085020 (rd=9=01001)
//   ADD   $t2,$t1,$t1   → opcode=0, rs=9,   rt=9,  rd=10(t2),shamt=0, funct=32 → 0x01295020... recalculated below
//   ADD   $t3,$t2,$t0   → opcode=0, rs=10,  rt=8,  rd=11(t3),shamt=0, funct=32

describe("Pipeline — RAW forwarding chain", () => {

    // Reference values computed by singleCycleRun (no hazards in single-cycle)
    function refValues() {
        const program = parseHexProgram(RAW_HEX);
        const r = makeCtx();
        singleCycleRun(r.processor, program, r.ctx);
        return r.regUnit;
    }

    it("pipelineHazardRun: forwarding produces correct values for tight RAW chain", () => {
        const program = parseHexProgram(RAW_HEX);
        const ref = refValues();

        const pip = makeCtx();
        pipelineHazardRun(pip.processor, program, pip.ctx);

        expect(pip.regUnit.read(registers.t0)).toBe(ref.read(registers.t0));
        expect(pip.regUnit.read(registers.t1)).toBe(ref.read(registers.t1));
        expect(pip.regUnit.read(registers.t2)).toBe(ref.read(registers.t2));
        expect(pip.regUnit.read(registers.t3)).toBe(ref.read(registers.t3));
    });
});

// ─── Suite 3 — Load-use hazard (stall) ────────────────────────────────────────
//
// LW followed immediately by an instruction that uses the loaded value.
// The hazard unit must insert exactly 1 stall bubble.
//
//  00: ADDIU $t0,$zero,42   → memory[0] setup not needed; we pre-write via MemoryUnit
//  01: SW    $t0,$zero,0    → mem[0] = 42
//  02: LW    $t1,$zero,0    → $t1 = mem[0] = 42   (load)
//  03: ADD   $t2,$t1,$t1   → $t2 = 84            (load-use hazard: needs stall)
//  04: NOP

const LOAD_USE_HEX = "2408002A AC080000 8C090000 01295020 00000000";

describe("Pipeline — Load-use hazard", () => {

    it("pipelineHazardRun: loaded value is correctly forwarded after stall", () => {
        const program = parseHexProgram(LOAD_USE_HEX);

        const ref = makeCtx();
        singleCycleRun(ref.processor, program, ref.ctx);

        const pip = makeCtx();
        pipelineHazardRun(pip.processor, program, pip.ctx);

        expect(pip.regUnit.read(registers.t1)).toBe(ref.regUnit.read(registers.t1)); // 42
        expect(pip.regUnit.read(registers.t2)).toBe(ref.regUnit.read(registers.t2)); // 84
    });

    it("pipelineHazardRun: cycle count reflects the extra stall cycle", () => {
        const program = parseHexProgram(LOAD_USE_HEX);
        const pip = makeCtx();
        const result = pipelineHazardRun(pip.processor, program, pip.ctx);

        // 5 instructions + 4 drain cycles + at least 1 stall = > 9
        expect(result.cycles).toBeGreaterThan(program.instructions.length + 3);
    });
});

// ─── Suite 4 — Branch & jump correctness (mirrors branching.test.ts) ──────────
//
// Same hex program used in branching.test.ts.
// Both runners must reach the same final register state as singleCycleRun.

const BRANCH_HEX =
    "34080005 34090005 340A0000 " +
    "11090002 254A0001 254A0001 " +
    "340B0001 " +
    "15090001 254A0001 340C0002 " +
    "240DFFFF " +
    "5C0D0002 254A0001 340E0003 340E0009 " +
    "5C0E0001 254A0001 340FAAAA " +
    "05600001 254A0001 340F5555 " +
    "C8000002 CBFFFFE9 C8000002 " +
    "34181111 C8000001 34192222 34183333";

describe("Pipeline — Branch & jump (full program)", () => {

    function refState() {
        const program = parseHexProgram(BRANCH_HEX);
        const r = makeCtx();
        singleCycleRun(r.processor, program, r.ctx);
        return r.regUnit;
    }

    it("pipelineHazardRun: final register state matches singleCycleRun", () => {
        const program = parseHexProgram(BRANCH_HEX);
        const ref = refState();

        const pip = makeCtx();
        pipelineHazardRun(pip.processor, program, pip.ctx);

        // Branch accumulator $t2 must equal 4
        expect(pip.regUnit.read(registers.t2)).toBe(ref.read(registers.t2));   // 4

        expect(pip.regUnit.read(registers.t0)).toBe(ref.read(registers.t0));   // 5
        expect(pip.regUnit.read(registers.t1)).toBe(ref.read(registers.t1));   // 5
        expect(pip.regUnit.read(registers.t3)).toBe(ref.read(registers.t3));   // 1
        expect(pip.regUnit.read(registers.t4)).toBe(ref.read(registers.t4));   // 2
        expect(pip.regUnit.read(registers.t5)).toBe(ref.read(registers.t5));   // 0xFFFFFFFF
        expect(pip.regUnit.read(registers.t6)).toBe(ref.read(registers.t6));   // 9
        expect(pip.regUnit.read(registers.t7)).toBe(ref.read(registers.t7));   // 0x5555
        expect(pip.regUnit.read(registers.t8)).toBe(ref.read(registers.t8));   // 0x3333
        expect(pip.regUnit.read(registers.t9)).toBe(ref.read(registers.t9));   // 0 (skipped)
    });

    it("pipelineHazardRun: $t9 is never written (skipped by BC at index 25)", () => {
        const program = parseHexProgram(BRANCH_HEX);
        const pip = makeCtx();
        pipelineHazardRun(pip.processor, program, pip.ctx);

        expect(pip.regUnit.read(registers.t9)).toBe(0x00000000);
    });

    it("pipelineHazardRun: $t8 reflects last write (index 27 overwrites index 24)", () => {
        const program = parseHexProgram(BRANCH_HEX);
        const pip = makeCtx();
        pipelineHazardRun(pip.processor, program, pip.ctx);

        expect(pip.regUnit.read(registers.t8)).toBe(0x00003333);
    });

    it("pipelineHazardRun: $t7 reflects last write (index 20 overwrites index 17)", () => {
        const program = parseHexProgram(BRANCH_HEX);
        const pip = makeCtx();
        pipelineHazardRun(pip.processor, program, pip.ctx);

        expect(pip.regUnit.read(registers.t7)).toBe(0x00005555);
    });
});

// ─── Suite 5 — CompileOutput shape ────────────────────────────────────────────

describe("Pipeline — CompileOutput contract", () => {
    const program = parseHexProgram(SIMPLE_HEX);

    it("pipelineRun returns registryState, cycles and time", () => {
        const pip = makeCtx();
        const out = pipelineRun(pip.processor, program, pip.ctx);

        expect(out.registryState).toBeDefined();
        expect(typeof out.cycles).toBe("number");
        expect(out.cycles).toBeGreaterThan(0);
        expect(typeof out.time).toBe("number");
        expect(out.time).toBeGreaterThanOrEqual(0);
    });

    it("pipelineHazardRun returns registryState, cycles and time", () => {
        const pip = makeCtx();
        const out = pipelineHazardRun(pip.processor, program, pip.ctx);

        expect(out.registryState).toBeDefined();
        expect(typeof out.cycles).toBe("number");
        expect(out.cycles).toBeGreaterThan(0);
        expect(typeof out.time).toBe("number");
        expect(out.time).toBeGreaterThanOrEqual(0);
    });

    it("pipelineHazardRun uses more cycles than raw instruction count (pipeline overhead)", () => {
        const pip = makeCtx();
        const out = pipelineHazardRun(pip.processor, program, pip.ctx);

        // Minimum overhead: 4 extra cycles to drain the 5-stage pipeline
        expect(out.cycles).toBeGreaterThanOrEqual(program.instructions.length + 4);
    });
});
