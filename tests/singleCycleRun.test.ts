import { singleCycleRun } from "../src/core/singleCycleRunner";
import { singleCycle } from "../src/core/singleCycle";
import MIPSv6Processor from "../src/core/MIPSv6Processor";
import RegisterUnit from "../src/core/hardware/RegisterUnit";
import MemoryUnit from "../src/core/hardware/MemoryUnit";
import type { ExecutionContext } from "../src/types/abstracts";
import { parseHexProgram } from "../src/helpers/parser.helper";
import { registers as mipsv6Registers } from "../src/isa/mipsv6/registers";

const registers = mipsv6Registers;

const SIMPLE_RAM_SOLVED_HEX =
    "25490001 01294820 00000000 25290001 2408000F 240A000F 01295820 016B6020 018C6820";

const SIMPLE_LW_SW_SOLVED_HEX =
    "34081000 3409000A 340A0005 AD090000 AD0A0004 8D0B0000 8D0C0004 016C6821 016C7023 016C7899 016CC0D9 AD0D0008 AD0E000C 8D190008 03296824 032A7025 01AE7826 032CC09B 032CC8DB 31EF00FF";

const SIMPLE_BRANCH_JUMP_HEX =
    "34080005 34090005 340A0000 11090002 254A0001 254A0001 340B0001 15090001 254A0001 340C0002 240DFFFF 5C0D0002 254A0001 340E0003 340E0009 5C0E0001 254A0001 340FAAAA 05600001 254A0001 340F5555 C8000002 CBFFFFE9 C8000002 34181111 C8000001 34192222 34183333";

function createContext(): ExecutionContext {
    return {
        registers: new RegisterUnit(new Array(32)),
        memory: new MemoryUnit(32, 1024),
        pc: 0,
    };
}

function createContextWithMemory(memoryAddresses = 0x2000): ExecutionContext {
    return {
        registers: new RegisterUnit(new Array(32)),
        memory: new MemoryUnit(32, memoryAddresses),
        pc: 0,
    };
}

function createProgram(hexString: string) {
    return parseHexProgram(hexString);
}

function getRegister(ctx: ExecutionContext, regIndex: number): number {
    return ctx.registers.read(regIndex);
}

function getMemory(ctx: ExecutionContext, address: number): number {
    return ctx.memory.read(address);
}

describe("Single Cycle Run (Complete Program Execution)", () => {
    let processor: MIPSv6Processor;

    beforeEach(() => {
        processor = new MIPSv6Processor();
    });

    describe("Basic program execution", () => {
        it("ejecuta un programa simple de 1 instruccion", () => {
            const ctx = createContext();
            const program = createProgram("25490001");

            const output = singleCycleRun(processor, program, ctx);

            expect(output.cycles).toBe(1);
            expect(output.time).toBeGreaterThan(0);
            expect(output.registryState).toBeInstanceOf(RegisterUnit);
        });

        it("ejecuta un programa de 2 instrucciones", () => {
            const ctx = createContext();
            const program = createProgram("25490001 01294820");

            const output = singleCycleRun(processor, program, ctx);

            expect(output.cycles).toBe(2);
            expect(ctx.pc).toBe(2);
        });

        it("ejecuta un programa de 5 instrucciones", () => {
            const ctx = createContext();
            const program = createProgram("25290001 25290001 25290001 25290001 25290001");

            const output = singleCycleRun(processor, program, ctx);

            expect(output.cycles).toBe(5);
            expect(ctx.pc).toBe(5);
            expect(getRegister(ctx, registers.t1)).toBe(5);
        });
    });

    describe("Program termination", () => {
        it("termina cuando PC alcanza el final del programa", () => {
            const ctx = createContext();
            const program = createProgram("25290001 25290001 25290001 25290001 25290001");

            singleCycleRun(processor, program, ctx);

            expect(ctx.pc).toBe(5);
        });

        it.each([
            [SIMPLE_RAM_SOLVED_HEX, 9],
            [SIMPLE_LW_SW_SOLVED_HEX, 20],
        ])("cuenta correctamente los ciclos para %i instrucciones", (hexProgram, expectedCycles) => {
            const ctx = hexProgram === SIMPLE_LW_SW_SOLVED_HEX
                ? createContextWithMemory()
                : createContext();
            const program = createProgram(hexProgram);

            const output = singleCycleRun(processor, program, ctx);

            expect(output.cycles).toBe(expectedCycles);
        });

        it("mide el tiempo de ejecucion", () => {
            const ctx = createContext();
            const program = createProgram(SIMPLE_RAM_SOLVED_HEX);

            const output = singleCycleRun(processor, program, ctx);

            expect(typeof output.time).toBe("number");
            expect(Number.isFinite(output.time)).toBe(true);
            expect(output.time).toBeGreaterThan(0);
        });
    });

    describe("Register state preservation", () => {
        it("retorna registryState como RegisterUnit", () => {
            const ctx = createContext();
            const program = createProgram("25490001");

            const output = singleCycleRun(processor, program, ctx);

            expect(output.registryState).toBeInstanceOf(RegisterUnit);
            expect(output.registryState).toBe(ctx.registers);
        });

        it("permite acceder a los registros finales", () => {
            const ctx = createContext();
            const program = createProgram("25290001 25290001 25290001");

            const output = singleCycleRun(processor, program, ctx);

            expect(output.registryState.read(registers.t1)).toBe(3);
        });
    });

    describe("Real classroom program 1: simpleRAMSolved", () => {
        it("ejecuta simpleRAMSolved completo", () => {
            const ctx = createContext();
            const program = createProgram(SIMPLE_RAM_SOLVED_HEX);

            const output = singleCycleRun(processor, program, ctx);

            expect(output.cycles).toBe(9);
            expect(ctx.pc).toBe(9);
        });

        it("verifica los valores finales de registros", () => {
            const program = createProgram(SIMPLE_RAM_SOLVED_HEX);
            const ctx = createContext();
            const result = singleCycleRun(processor, program, ctx);

            expect(result.registryState.read(registers.t0)).toBe(15);
            expect(result.registryState.read(registers.t1)).toBe(3);
            expect(result.registryState.read(registers.t2)).toBe(15);
            expect(result.registryState.read(registers.t3)).toBe(6);
            expect(result.registryState.read(registers.t4)).toBe(12);
            expect(result.registryState.read(registers.t5)).toBe(24);
            expect(result.registryState.read(registers.t6)).toBe(0);
            expect(result.registryState.read(registers.t7)).toBe(0);
            expect(result.registryState.read(registers.t8)).toBe(0);
            expect(result.registryState.read(registers.t9)).toBe(0);
            expect(result.cycles).toBe(9);
        });
    });

    describe("Real classroom program 2: simpleRamLwSwSolved", () => {
        it("ejecuta el programa con LW/SW completo", () => {
            const ctx = createContextWithMemory();
            const program = createProgram(SIMPLE_LW_SW_SOLVED_HEX);

            const output = singleCycleRun(processor, program, ctx);

            expect(output.cycles).toBe(20);
            expect(ctx.pc).toBe(20);
        });

        it("verifica los valores finales de registros", () => {
            const program = createProgram(SIMPLE_LW_SW_SOLVED_HEX);
            const ctx = createContextWithMemory();
            const result = singleCycleRun(processor, program, ctx);

            expect(result.registryState.read(registers.t0)).toBe(0x00001000);
            expect(result.registryState.read(registers.t1)).toBe(10);
            expect(result.registryState.read(registers.t2)).toBe(5);
            expect(result.registryState.read(registers.t3)).toBe(10);
            expect(result.registryState.read(registers.t4)).toBe(5);
            expect(result.registryState.read(registers.t5)).toBe(10);
            expect(result.registryState.read(registers.t6)).toBe(15);
            expect(result.registryState.read(registers.t7)).toBe(5);
            expect(result.registryState.read(registers.t8)).toBe(3);
            expect(result.registryState.read(registers.t9)).toBe(0);
        });

        it("verifica los valores finales en memoria", () => {
            const program = createProgram(SIMPLE_LW_SW_SOLVED_HEX);
            const ctx = createContextWithMemory();

            singleCycleRun(processor, program, ctx);

            expect(getMemory(ctx, 0x1000)).toBe(10);
            expect(getMemory(ctx, 0x1004)).toBe(5);
            expect(getMemory(ctx, 0x1008)).toBe(15);
            expect(getMemory(ctx, 0x100c)).toBe(5);
        });
    });

    describe("Real classroom program 3: simpleRamBranchJumpResult", () => {
        it("ejecuta el programa con branch/jump completo sin errores", () => {
            const ctx = createContext();
            const program = createProgram(SIMPLE_BRANCH_JUMP_HEX);

            expect(() => singleCycleRun(processor, program, ctx)).not.toThrow();
            expect(ctx.pc).toBe(program.instructions.length);
        });

        it("verifica los valores finales de registros", () => {
            const program = createProgram(SIMPLE_BRANCH_JUMP_HEX);
            const ctx = createContext();
            const result = singleCycleRun(processor, program, ctx);

            expect(result.registryState.read(registers.t0)).toBe(5);
            expect(result.registryState.read(registers.t1)).toBe(5);
            expect(result.registryState.read(registers.t2)).toBe(4);
            expect(result.registryState.read(registers.t3)).toBe(1);
            expect(result.registryState.read(registers.t4)).toBe(2);
            expect(result.registryState.read(registers.t5)).toBe(0xffffffff);
            expect(result.registryState.read(registers.t6)).toBe(9);
            expect(result.registryState.read(registers.t7)).toBe(0x5555);
            expect(result.registryState.read(registers.t8)).toBe(0x3333);
            expect(result.registryState.read(registers.t9)).toBe(0);
            expect(result.cycles).toBeLessThan(program.instructions.length);
        });
    });

    describe("Output structure", () => {
        it("contiene registryState, time y cycles con tipos validos", () => {
            const ctx = createContext();
            const program = createProgram("25490001");

            const output = singleCycleRun(processor, program, ctx);

            expect(output.registryState).toBeDefined();
            expect(output.registryState).toBeInstanceOf(RegisterUnit);
            expect(typeof output.time).toBe("number");
            expect(output.time).toBeGreaterThan(0);
            expect(typeof output.cycles).toBe("number");
            expect(Number.isInteger(output.cycles)).toBe(true);
            expect(output.cycles).toBeGreaterThan(0);
        });
    });

    describe("Empty programs", () => {
        it("ejecuta un programa vacio sin avanzar PC", () => {
            const ctx = createContext();
            const program = createProgram("");

            const output = singleCycleRun(processor, program, ctx);

            expect(output.cycles).toBe(0);
            expect(ctx.pc).toBe(0);
            expect(output.registryState).toBeInstanceOf(RegisterUnit);
        });
    });

    describe("Single instruction programs", () => {
        it("ejecuta ADDIU en una sola instruccion", () => {
            const ctx = createContext();
            const program = createProgram("25490001");

            const output = singleCycleRun(processor, program, ctx);

            expect(output.cycles).toBe(1);
            expect(ctx.pc).toBe(1);
            expect(getRegister(ctx, registers.t1)).toBe(1);
        });

        it("ejecuta ADD en una sola instruccion", () => {
            const ctx = createContext();
            ctx.registers.write(registers.t1, 7);
            const program = createProgram("01294820");

            const output = singleCycleRun(processor, program, ctx);

            expect(output.cycles).toBe(1);
            expect(ctx.pc).toBe(1);
            expect(getRegister(ctx, registers.t1)).toBe(14);
        });

        it("ejecuta NOP en una sola instruccion", () => {
            const ctx = createContext();
            ctx.registers.write(registers.t0, 99);
            const program = createProgram("00000000");

            const output = singleCycleRun(processor, program, ctx);

            expect(output.cycles).toBe(1);
            expect(ctx.pc).toBe(1);
            expect(getRegister(ctx, registers.t0)).toBe(99);
        });

        it("ejecuta LW en una sola instruccion", () => {
            const ctx = createContext();
            ctx.registers.write(registers.t1, 32);
            ctx.memory.write(32, 0x1234);
            const program = createProgram("8D2A0000");

            const output = singleCycleRun(processor, program, ctx);

            expect(output.cycles).toBe(1);
            expect(ctx.pc).toBe(1);
            expect(getRegister(ctx, registers.t2)).toBe(0x1234);
        });

        it("ejecuta SW en una sola instruccion", () => {
            const ctx = createContext();
            ctx.registers.write(registers.t1, 32);
            ctx.registers.write(registers.t0, 0xabcd);
            const program = createProgram("AD280000");

            const output = singleCycleRun(processor, program, ctx);

            expect(output.cycles).toBe(1);
            expect(ctx.pc).toBe(1);
            expect(getMemory(ctx, 32)).toBe(0xabcd);
        });
    });

    describe("Program with jumps that skip instructions", () => {
        it("termina correctamente cuando salta sobre instrucciones con BC", () => {
            const ctx = createContext();
            const program = createProgram("34080001 C8000002 34090011 34090022 340A0033");

            const output = singleCycleRun(processor, program, ctx);

            expect(output.cycles).toBe(3);
            expect(getRegister(ctx, registers.t1)).toBe(0);
            expect(getRegister(ctx, registers.t2)).toBe(0x33);
            expect(ctx.pc).toBe(program.instructions.length);
        });

        it("ejecuta un salto forward con J y conserva la delay slot", () => {
            const ctx = createContext();
            const program = createProgram("08000001 24080001 24080002 24080003 24090009");

            const output = singleCycleRun(processor, program, ctx);

            expect(output.cycles).toBe(3);
            expect(getRegister(ctx, registers.t0)).toBe(1);
            expect(getRegister(ctx, registers.t1)).toBe(9);
            expect(ctx.pc).toBe(program.instructions.length);
        });
    });

    describe("Arithmetic operations consistency", () => {
        it("mantiene una cascada correcta de ADD", () => {
            const ctx = createContext();
            const program = createProgram("34080001 34090001 01095020 014A5820 016B6020");

            singleCycleRun(processor, program, ctx);

            expect(getRegister(ctx, registers.t2)).toBe(2);
            expect(getRegister(ctx, registers.t3)).toBe(4);
            expect(getRegister(ctx, registers.t4)).toBe(8);
        });

        it("mantiene una secuencia consistente de SUB", () => {
            const ctx = createContext();
            const program = createProgram("34080009 34090003 01095022 01495822");

            singleCycleRun(processor, program, ctx);

            expect(getRegister(ctx, registers.t2)).toBe(6);
            expect(getRegister(ctx, registers.t3)).toBe(3);
        });

        it("mantiene una secuencia consistente de MUL", () => {
            const ctx = createContext();
            const program = createProgram("34080002 34090003 01095098 01485898");

            singleCycleRun(processor, program, ctx);

            expect(getRegister(ctx, registers.t2)).toBe(6);
            expect(getRegister(ctx, registers.t3)).toBe(12);
        });
    });

    describe("Memory operations consistency", () => {
        it("SW seguido de LW retorna el mismo valor", () => {
            const ctx = createContext();
            const program = createProgram("34080064 34090020 AD280000 8D2A0000");

            singleCycleRun(processor, program, ctx);

            expect(getMemory(ctx, 0x20)).toBe(100);
            expect(getRegister(ctx, registers.t0)).toBe(getRegister(ctx, registers.t2));
        });

        it("soporta multiples SW y LW en secuencia", () => {
            const ctx = createContext();
            const program = createProgram(
                "34090020 34080011 340A0022 AD280000 AD2A0004 8D2B0000 8D2C0004"
            );

            singleCycleRun(processor, program, ctx);

            expect(getMemory(ctx, 0x20)).toBe(0x11);
            expect(getMemory(ctx, 0x24)).toBe(0x22);
            expect(getRegister(ctx, registers.t3)).toBe(0x11);
            expect(getRegister(ctx, registers.t4)).toBe(0x22);
        });
    });

    describe("Logical operations consistency", () => {
        it("ejecuta AND, OR y XOR secuenciales", () => {
            const ctx = createContext();
            const program = createProgram("3408000C 3409000A 01095024 01095825 01096026");

            singleCycleRun(processor, program, ctx);

            expect(getRegister(ctx, registers.t2)).toBe(0b1000);
            expect(getRegister(ctx, registers.t3)).toBe(0b1110);
            expect(getRegister(ctx, registers.t4)).toBe(0b0110);
        });

        it("verifica identidades logicas basicas", () => {
            const ctx = createContext();
            const program = createProgram("34080F0F 310A0F0F 350B0000 390C0F0F");

            singleCycleRun(processor, program, ctx);

            expect(getRegister(ctx, registers.t2)).toBe(0x0f0f);
            expect(getRegister(ctx, registers.t3)).toBe(0x0f0f);
            expect(getRegister(ctx, registers.t4)).toBe(0);
        });
    });

    describe("Branch and jump flow", () => {
        it("ejecuta un BEQ tomado", () => {
            const ctx = createContext();
            const program = createProgram("34080005 34090005 11090002 240A0001 240A0002 240B0003");

            const output = singleCycleRun(processor, program, ctx);

            expect(output.cycles).toBe(5);
            expect(getRegister(ctx, registers.t2)).toBe(1);
            expect(getRegister(ctx, registers.t3)).toBe(3);
        });

        it("ejecuta un BEQ no tomado", () => {
            const ctx = createContext();
            const program = createProgram("34080005 34090006 11090002 240A0001 240A0002");

            singleCycleRun(processor, program, ctx);

            expect(getRegister(ctx, registers.t2)).toBe(2);
            expect(ctx.pc).toBe(program.instructions.length);
        });

        it("ejecuta un BNE tomado", () => {
            const ctx = createContext();
            const program = createProgram("34080005 34090006 15090002 240A0001 240A0002 240B0003");

            const output = singleCycleRun(processor, program, ctx);

            expect(output.cycles).toBe(4);
            expect(getRegister(ctx, registers.t2)).toBe(0);
            expect(getRegister(ctx, registers.t3)).toBe(3);
        });

        it("ejecuta un BNE no tomado", () => {
            const ctx = createContext();
            const program = createProgram("34080005 34090005 15090002 240A0001 240A0002");

            singleCycleRun(processor, program, ctx);

            expect(getRegister(ctx, registers.t2)).toBe(2);
            expect(ctx.pc).toBe(program.instructions.length);
        });

        it("ejecuta un salto incondicional con BC", () => {
            const ctx = createContext();
            const program = createProgram("24080000 C8000002 24090001 24090002 240A0003");

            const output = singleCycleRun(processor, program, ctx);

            expect(output.cycles).toBe(3);
            expect(getRegister(ctx, registers.t1)).toBe(0);
            expect(getRegister(ctx, registers.t2)).toBe(3);
        });
    });

    describe("Register zero integrity", () => {
        it("mantiene $zero en 0 despues de ejecutar el programa", () => {
            const ctx = createContext();
            const program = createProgram("2400000A 3400000F 00000000");

            const result = singleCycleRun(processor, program, ctx);

            expect(result.registryState.read(0)).toBe(0);
        });
    });

    describe("PC correctness after full execution", () => {
        it("deja PC final en 9 para el programa simpleRAMSolved", () => {
            const ctx = createContext();
            const program = createProgram(SIMPLE_RAM_SOLVED_HEX);

            singleCycleRun(processor, program, ctx);

            expect(ctx.pc).toBe(9);
        });

        it("deja PC final en 20 para el programa simpleRamLwSwSolved", () => {
            const ctx = createContextWithMemory();
            const program = createProgram(SIMPLE_LW_SW_SOLVED_HEX);

            singleCycleRun(processor, program, ctx);

            expect(ctx.pc).toBe(20);
        });
    });

    describe("Timing measurements", () => {
        it("reporta un tiempo positivo y valido", () => {
            const ctx = createContext();
            const program = createProgram("25290001 25290001 25290001");

            const output = singleCycleRun(processor, program, ctx);

            expect(output.time).toBeGreaterThan(0);
            expect(Number.isFinite(output.time)).toBe(true);
        });
    });

    describe("Cycle counting", () => {
        it("coincide con program.length para programas sin saltos", () => {
            const ctx = createContext();
            const program = createProgram("25290001 25290001 25290001 25290001");

            const output = singleCycleRun(processor, program, ctx);

            expect(output.cycles).toBe(program.instructions.length);
        });

        it("puede variar con saltos segun el flujo real", () => {
            const ctx = createContext();
            const program = createProgram(SIMPLE_BRANCH_JUMP_HEX);

            const output = singleCycleRun(processor, program, ctx);

            expect(output.cycles).toBeLessThan(program.instructions.length);
            expect(output.cycles).toBe(23);
        });
    });

    describe("Stress tests", () => {
        it("ejecuta un programa con mas de 50 instrucciones", () => {
            const ctx = createContext();
            const hexProgram = new Array(60).fill("25290001").join(" ");
            const program = createProgram(hexProgram);

            const output = singleCycleRun(processor, program, ctx);

            expect(output.cycles).toBe(60);
            expect(ctx.pc).toBe(60);
            expect(getRegister(ctx, registers.t1)).toBe(60);
        });

        it("ejecuta muchas operaciones de memoria consecutivas", () => {
            const ctx = createContext();
            const program = createProgram(
                "34090020 34080011 340A0022 340B0033 340C0044 AD280000 AD2A0004 AD2B0008 AD2C000C 8D2D0000 8D2E0004 8D2F0008 8D30000C"
            );

            const output = singleCycleRun(processor, program, ctx);

            expect(output.cycles).toBe(13);
            expect(getMemory(ctx, 0x20)).toBe(0x11);
            expect(getMemory(ctx, 0x24)).toBe(0x22);
            expect(getMemory(ctx, 0x28)).toBe(0x33);
            expect(getMemory(ctx, 0x2c)).toBe(0x44);
            expect(getRegister(ctx, registers.t5)).toBe(0x11);
            expect(getRegister(ctx, registers.t6)).toBe(0x22);
            expect(getRegister(ctx, registers.t7)).toBe(0x33);
            expect(getRegister(ctx, registers.s0)).toBe(0x44);
        });

        it("ejecuta un programa con muchos saltos", () => {
            const ctx = createContext();
            const program = createProgram(SIMPLE_BRANCH_JUMP_HEX);

            const output = singleCycleRun(processor, program, ctx);

            expect(output.cycles).toBe(23);
            expect(getRegister(ctx, registers.t2)).toBe(4);
            expect(ctx.pc).toBe(program.instructions.length);
        });
    });

    describe("Edge cases", () => {
        it("termina exactamente en la ultima instruccion", () => {
            const ctx = createContext();
            const program = createProgram("24080001 24090002 01095020");

            const output = singleCycleRun(processor, program, ctx);

            expect(output.cycles).toBe(3);
            expect(ctx.pc).toBe(3);
            expect(getRegister(ctx, registers.t2)).toBe(3);
        });

        it("permite acceder a la direccion maxima valida de memoria", () => {
            const ctx = createContext();
            const program = createProgram("3408007B 340903FF AD280000 8D2A0000");

            singleCycleRun(processor, program, ctx);

            expect(getMemory(ctx, 1023)).toBe(0x7b);
            expect(getRegister(ctx, registers.t2)).toBe(0x7b);
        });
    });

    describe("Non-destructive execution", () => {
        it("ejecuta el mismo programa dos veces con contextos diferentes sin compartir estado", () => {
            const program = createProgram("25290001 25290001 25290001");
            const firstCtx = createContext();
            const secondCtx = createContext();

            singleCycleRun(processor, program, firstCtx);
            singleCycleRun(new MIPSv6Processor(), program, secondCtx);

            expect(getRegister(firstCtx, registers.t1)).toBe(3);
            expect(getRegister(secondCtx, registers.t1)).toBe(3);
            expect(firstCtx).not.toBe(secondCtx);
            expect(firstCtx.registers).not.toBe(secondCtx.registers);
            expect(firstCtx.memory).not.toBe(secondCtx.memory);
        });

        it("modifica el ExecutionContext recibido en lugar y de forma esperada", () => {
            const ctx = createContext();
            const originalPC = ctx.pc;
            const originalRegisters = ctx.registers;
            const program = createProgram("25290001 25290001");

            const result = singleCycleRun(processor, program, ctx);

            expect(originalPC).toBe(0);
            expect(ctx.pc).toBe(2);
            expect(ctx.registers).toBe(originalRegisters);
            expect(result.registryState).toBe(ctx.registers);
            expect(getRegister(ctx, registers.t1)).toBe(2);
        });
    });

    describe("Consistency with single cycle tests", () => {
        it("produce el mismo resultado que tres llamadas a singleCycle", () => {
            const program = createProgram("24080001 24090002 01095020");
            const runCtx = createContext();
            const stepCtx = createContext();
            const stepProcessor = new MIPSv6Processor();

            const runResult = singleCycleRun(processor, program, runCtx);
            singleCycle(stepProcessor, program, stepCtx);
            singleCycle(stepProcessor, program, stepCtx);
            singleCycle(stepProcessor, program, stepCtx);

            expect(runResult.cycles).toBe(3);
            expect(runCtx.pc).toBe(stepCtx.pc);
            expect(getRegister(runCtx, registers.t0)).toBe(getRegister(stepCtx, registers.t0));
            expect(getRegister(runCtx, registers.t1)).toBe(getRegister(stepCtx, registers.t1));
            expect(getRegister(runCtx, registers.t2)).toBe(getRegister(stepCtx, registers.t2));
        });
    });
});
