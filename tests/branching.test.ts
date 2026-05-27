import {
    singleCycle,
    MIPSv6Processor,
    RegisterUnit,
    MemoryUnit,
    parseHexProgram,
    ExecutionContext,
    mipsv6Registers as registers,
    Program,
    singleCycleRun
} from "../src/index";

/**
 * Test suite for the simpleRamBranchJump.hex program.
 *
 * Program layout (index → instruction):
 *  00: ORI  $t0,$zero,5
 *  01: ORI  $t1,$zero,5
 *  02: ORI  $t2,$zero,0
 *  03: BEQ  $t0,$t1,+2   ← delay slot branch, TAKEN  (target = 06)
 *  04: ADDIU $t2,$t2,1   ← delay slot of BEQ
 *  05: ADDIU $t2,$t2,1   ← SKIPPED
 *  06: ORI  $t3,$zero,1
 *  07: BNE  $t0,$t1,+1   ← delay slot branch, NOT TAKEN (target would be 09)
 *  08: ADDIU $t2,$t2,1   ← delay slot of BNE (always executes)
 *  09: ORI  $t4,$zero,2
 *  10: ADDIU $t5,$zero,-1
 *  11: BGTZC $t5,+2      ← NO delay slot, NOT TAKEN  (−1 > 0 is false)
 *  12: ADDIU $t2,$t2,1
 *  13: ORI  $t6,$zero,3
 *  14: ORI  $t6,$zero,9
 *  15: BGTZC $t6,+1      ← NO delay slot, TAKEN      (target = 17)
 *  16: ADDIU $t2,$t2,1   ← SKIPPED
 *  17: ORI  $t7,$zero,0xAAAA
 *  18: BLTZ $t3,+1       ← delay slot branch, NOT TAKEN (target would be 20)
 *  19: ADDIU $t2,$t2,1   ← delay slot of BLTZ (always executes)
 *  20: ORI  $t7,$zero,0x5555
 *  21: BC   +2            ← NO delay slot, TAKEN      (target = 24)
 *  22: BC   −23           ← SKIPPED
 *  23: BC   +2            ← SKIPPED
 *  24: ORI  $t8,$zero,0x1111
 *  25: BC   +1            ← NO delay slot, TAKEN      (target = 27)
 *  26: ORI  $t9,$zero,0x2222 ← SKIPPED
 *  27: ORI  $t8,$zero,0x3333
 */

describe("MIPSv6 Branch & Jump Execution — simpleRamBranchJump.hex", () => {
    let processor: MIPSv6Processor;
    let regUnit: RegisterUnit;
    let memUnit: MemoryUnit;
    let ctx: ExecutionContext;
    let program: Program = parseHexProgram("");

    beforeEach(() => {
        //Setup inicial del programa y el contexto
        const hexProgram =
            "34080005 34090005 340A0000 " + // 00-02
            "11090002 254A0001 254A0001 " + // 03-05
            "340B0001 " +                   // 06
            "15090001 254A0001 340C0002 " + // 07-09
            "240DFFFF " +                   // 10
            "5C0D0002 254A0001 340E0003 340E0009 " + // 11-14
            "5C0E0001 254A0001 340FAAAA " + // 15-17
            "05600001 254A0001 340F5555 " + // 18-20
            "C8000002 CBFFFFE9 C8000002 " + // 21-23
            "34181111 C8000001 34192222 34183333"; // 24-27

        program = parseHexProgram(hexProgram);
        processor = new MIPSv6Processor();
        regUnit = new RegisterUnit(new Array(32));
        memUnit = new MemoryUnit(32, 1024);
        ctx = { registers: regUnit, memory: memUnit, pc: 0 };
    });

    // ─── Helper ───────────────────────────────────────────────────────────────
    /** Advance N cycles without assertions (for setup). */
    function runCycles(program: ReturnType<typeof parseHexProgram>, n: number) {
        for (let i = 0; i < n; i++) singleCycle(processor, program, ctx);
    }

    // ─── Main test ────────────────────────────────────────────────────────────
    it("executes setup instructions 00–02 and advances PC normally", () => {

        // Cycle 00: ORI $t0,$zero,5
        singleCycle(processor, program, ctx);
        expect(regUnit.read(registers.t0)).toBe(0x00000005);
        expect(ctx.pc).toBe(1);
        expect(ctx.delayPending).toBeFalsy();

        // Cycle 01: ORI $t1,$zero,5
        singleCycle(processor, program, ctx);
        expect(regUnit.read(registers.t1)).toBe(0x00000005);
        expect(ctx.pc).toBe(2);
        expect(ctx.delayPending).toBeFalsy();

        // Cycle 02: ORI $t2,$zero,0
        singleCycle(processor, program, ctx);
        expect(regUnit.read(registers.t2)).toBe(0x00000000);
        expect(ctx.pc).toBe(3);
        expect(ctx.delayPending).toBeFalsy();

    });

    // ─── BEQ (delay slot, TAKEN) ───────────────────────────────────────────────
    it("cycle 03 — BEQ TAKEN: sets delayPending=true and PC jumps to target (06)", () => {
        runCycles(program, 3); // reach index 03

        // Cycle 03: BEQ $t0,$t1,+2  →  5==5 → TAKEN, target = 03+1+2 = 06
        singleCycle(processor, program, ctx);

        //al final del ciclo de BEQ se tuvo que haber guardado lo siguiente en el ctx:
        expect(ctx.delayPending).toBe(true);
        expect(ctx.jumpAddress).toBe(6);
    });

    it("cycle 04 — BEQ delay slot executes (ADDIU $t2,$t2,1) then delayPending clears", () => {
        runCycles(program, 4); // execute through cycle 03 (branch), now about to run delay slot

        // Cycle 04: delay slot — ADDIU $t2,$t2,1  → $t2 = 0x00000001
        singleCycle(processor, program, ctx);
        expect(regUnit.read(registers.t2)).toBe(0x00000001);
        expect(ctx.delayPending).toBeFalsy();          // delay slot consumed, flag cleared
        // Se espera que la siguiente instruccion sea la del salto declarado en el ciclo de BEQ
        expect(ctx.pc).toBe(6);
    });

    // ─── BNE (delay slot, NOT TAKEN) ──────────────────────────────────────────
    it("cycle 07 — BNE NOT TAKEN: PC advances sequentially (08→09)", () => {
        runCycles(program, 7); // reach index 07

        // Cycle 07: BNE $t0,$t1,+1 → 5!=5? NO → NOT TAKEN
        singleCycle(processor, program, ctx);
        expect(ctx.delayPending).toBeFalsy(); //si no se toma un branch, esta bandera ha de ser falsa
        expect(ctx.pc).toBe(9);               // NOT TAKEN: PC = 07+1+1 = 09 
    });

    it("cycle 08 — BNE delay slot executes regardless (ADDIU $t2,$t2,1)", () => {
        runCycles(program, 8);

        // Cycle 08: delay slot — ADDIU $t2,$t2,1 → $t2 = 0x00000002
        singleCycle(processor, program, ctx);
        expect(regUnit.read(registers.t2)).toBe(0x00000002);
        expect(ctx.delayPending).toBeFalsy();
        expect(ctx.pc).toBe(10);
    });

    // ─── BGTZC (NO delay slot, NOT TAKEN) ─────────────────────────────────────
    it("cycle 11 — BGTZC NOT TAKEN: PC advances to 12", () => {
        runCycles(program, 11); // reach index 11

        // Cycle 11: BGTZC $t5,+2 → $t5 = 0xFFFFFFFF (−1), −1 > 0? NO → NOT TAKEN
        singleCycle(processor, program, ctx);
        expect(ctx.delayPending).toBeFalsy();          // compact branch — no delay slot
        expect(ctx.pc).toBe(13);                   // fall-through: next sequential instruction
    });

    // ─── BGTZC (NO delay slot, TAKEN) ─────────────────────────────────────────
    it("cycle 15 — BGTZC TAKEN: PC jumps to 17 (skips index 16)", () => {
        runCycles(program, 14); // reach index 15 (pc=15 in cycle #13 because of previous jump)

        // Cycle 15: BGTZC $t6,+1 → $t6 = 9, 9 > 0 → TAKEN, target = 15+1+1 = 17
        singleCycle(processor, program, ctx);
        expect(ctx.delayPending).toBeFalsy();          // compact branch — no delay slot
        expect(ctx.pc).toBe(17);                   // 
        // Confirm $t2 was NOT incremented by skipped instruction 16
        expect(regUnit.read(registers.t2)).toBe(0x00000003);
    });

    // ─── BLTZ (delay slot, NOT TAKEN) ─────────────────────────────────────────
    it("cycle 18 — BLTZ NOT TAKEN: PC advances sequentially (19→20)", () => {
        runCycles(program, 16); // reach index 18

        // instruction 18: BLTZ $t3,+1 → $t3 = 1, 1 < 0? NO → NOT TAKEN
        singleCycle(processor, program, ctx);
        expect(ctx.delayPending).toBe(false);
        expect(ctx.pc).toBe(19);                   // NOT TAKEN: PC = 18+1 = 19 (sequential after DS)
    });

    // ─── BC (NO delay slot, TAKEN — jumps over two instructions) ──────────────
    it("cycle 21 — BC +2 TAKEN: delayPending=false, PC jumps to 24 (skips 22 and 23)", () => {
        runCycles(program, 19); // reach index 21

        // Cycle 21: BC +2 → unconditional, TAKEN, target = 21+1+2 = 24
        singleCycle(processor, program, ctx);
        expect(ctx.delayPending).toBeFalsy();          // BC is a compact branch
        expect(ctx.pc).toBe(24);                   // jumped over indices 22 and 23
    });

    // ─── BC (NO delay slot, TAKEN — short forward jump) ───────────────────────
    it("cycle 25 — BC +1 TAKEN: delayPending=false, PC jumps to 27 (skips index 26)", () => {
        runCycles(program, 21); // reach index 25

        // Cycle 25: BC +1 → unconditional, TAKEN, target = 25+1+1 = 27
        singleCycle(processor, program, ctx);
        expect(ctx.delayPending).toBeFalsy();
        expect(ctx.pc).toBe(27);                   // jumped over index 26 ($t9 never written)
    });

    // ─── Full-program final state ──────────────────────────────────────────────
    it("full run — final register state matches expected trace", () => {
        // Run all 28 instructions (indices 00–27, accounting for skipped ones)
        singleCycleRun(processor, program, ctx);

        // ── Accumulator $t2: incremented at DS of BEQ(04), DS of BNE(08),
        //    fallthrough of BGTZC-NOT-TAKEN(12), DS of BLTZ(19) → total = 4
        expect(regUnit.read(registers.t2)).toBe(0x00000004);

        // ── ORI results
        expect(regUnit.read(registers.t0)).toBe(0x00000005);   // index 00
        expect(regUnit.read(registers.t1)).toBe(0x00000005);   // index 01
        expect(regUnit.read(registers.t3)).toBe(0x00000001);   // index 06
        expect(regUnit.read(registers.t4)).toBe(0x00000002);   // index 09
        expect(regUnit.read(registers.t5)).toBe(0xFFFFFFFF);   // index 10  (−1 as unsigned)
        // $t6 last written at index 14 (ORI $t6,$zero,9), index 13 overwritten
        expect(regUnit.read(registers.t6)).toBe(0x00000009);   // index 14
        // $t7 last written at index 20 (ORI $t7,$zero,0x5555), index 17 overwritten
        expect(regUnit.read(registers.t7)).toBe(0x00005555);   // index 20
        // $t8 last written at index 27 (ORI $t8,$zero,0x3333), index 24 overwritten
        expect(regUnit.read(registers.t8)).toBe(0x00003333);   // index 27
        // $t9 at index 26 was SKIPPED by BC at 25
        expect(regUnit.read(registers.t9)).toBe(0x00000000);   // never written

        printRegisterState(ctx.registers)
    });
});

function printRegisterState(regUnit: RegisterUnit) {
    console.log("====================================");
    console.log("FINAL REGISTER STATES:");
    console.log(`$t0 = 0x${regUnit.read(registers.t0).toString(16).padStart(8, "0")}`);
    console.log(`$t1 = 0x${regUnit.read(registers.t1).toString(16).padStart(8, "0")}`);
    console.log(`$t2 = 0x${regUnit.read(registers.t2).toString(16).padStart(8, "0")} (branch accumulator)`);
    console.log(`$t3 = 0x${regUnit.read(registers.t3).toString(16).padStart(8, "0")}`);
    console.log(`$t4 = 0x${regUnit.read(registers.t4).toString(16).padStart(8, "0")}`);
    console.log(`$t5 = 0x${regUnit.read(registers.t5).toString(16).padStart(8, "0")}`);
    console.log(`$t6 = 0x${regUnit.read(registers.t6).toString(16).padStart(8, "0")}`);
    console.log(`$t7 = 0x${regUnit.read(registers.t7).toString(16).padStart(8, "0")}`);
    console.log(`$t8 = 0x${regUnit.read(registers.t8).toString(16).padStart(8, "0")}`);
    console.log(`$t9 = 0x${regUnit.read(registers.t9).toString(16).padStart(8, "0")}`);
    console.log("====================================");
}