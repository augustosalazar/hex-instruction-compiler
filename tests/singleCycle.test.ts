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

function createContext(): ExecutionContext {
    return {
        registers: new RegisterUnit(new Array(32)),
        memory: new MemoryUnit(32, 1024),
        pc: 0,
    };
}

function createLargeMemoryContext(memoryAddresses = 0x2000): ExecutionContext {
    return {
        registers: new RegisterUnit(new Array(32)),
        memory: new MemoryUnit(32, memoryAddresses),
        pc: 0,
    };
}

function createProgram(hexString: string) {
    return parseHexProgram(hexString);
}

function setRegister(ctx: ExecutionContext, regIndex: number, value: number) {
    ctx.registers.write(regIndex, value);
}

function getRegister(ctx: ExecutionContext, regIndex: number): number {
    return ctx.registers.read(regIndex);
}

describe("Single Cycle Execution", () => {
    let processor: MIPSv6Processor;

    beforeEach(() => {
        processor = new MIPSv6Processor();
    });

    describe("Pipeline orchestration", () => {
        it("ejecuta fetch, decode, execute, memoryAccess y writeback en orden", () => {
            const ctx = createContext();
            const program = createProgram("25490001");
            const fetchSpy = jest.spyOn(processor, "fetch");
            const decodeSpy = jest.spyOn(processor, "decode");
            const executeSpy = jest.spyOn(processor, "execute");
            const memorySpy = jest.spyOn(processor, "memoryAccess");
            const writebackSpy = jest.spyOn(processor, "writeback");

            singleCycle(processor, program, ctx);

            expect(fetchSpy).toHaveBeenCalledWith(program, ctx);
            expect(decodeSpy).toHaveBeenCalledWith(0x25490001, ctx);
            expect(executeSpy).toHaveBeenCalledTimes(1);
            expect(memorySpy).toHaveBeenCalledTimes(1);
            expect(writebackSpy).toHaveBeenCalledTimes(1);
            expect(fetchSpy.mock.invocationCallOrder[0]).toBeLessThan(decodeSpy.mock.invocationCallOrder[0]);
            expect(decodeSpy.mock.invocationCallOrder[0]).toBeLessThan(executeSpy.mock.invocationCallOrder[0]);
            expect(executeSpy.mock.invocationCallOrder[0]).toBeLessThan(memorySpy.mock.invocationCallOrder[0]);
            expect(memorySpy.mock.invocationCallOrder[0]).toBeLessThan(writebackSpy.mock.invocationCallOrder[0]);
        });
    });

    describe("Basic cycle execution", () => {
        it("ejecuta un ciclo completo con ADD", () => {
            const ctx = createContext();
            const program = createProgram("01294820");
            setRegister(ctx, registers.t1, 5);

            singleCycle(processor, program, ctx);

            expect(getRegister(ctx, registers.t1)).toBe(10);
            expect(ctx.pc).toBe(1);
        });

        it("ejecuta un ciclo con ADDIU", () => {
            const ctx = createContext();
            const program = createProgram("25490001");
            setRegister(ctx, registers.t2, 10);

            singleCycle(processor, program, ctx);

            expect(getRegister(ctx, registers.t1)).toBe(11);
            expect(ctx.pc).toBe(1);
        });

        it("ejecuta un ciclo con NOP", () => {
            const ctx = createContext();
            const program = createProgram("00000000");
            setRegister(ctx, registers.t0, 123);

            singleCycle(processor, program, ctx);

            expect(ctx.pc).toBe(1);
            expect(getRegister(ctx, registers.t0)).toBe(123);
            expect(getRegister(ctx, registers.zero)).toBe(0);
        });
    });

    describe("PC (Program Counter) management", () => {
        it("inicia en 0 en un contexto nuevo", () => {
            const ctx = createContext();

            expect(ctx.pc).toBe(0);
        });

        it("incrementa despues de cada ciclo secuencial", () => {
            const ctx = createContext();
            const program = createProgram("25490001 01294820");
            setRegister(ctx, registers.t2, 10);

            singleCycle(processor, program, ctx);
            expect(ctx.pc).toBe(1);

            singleCycle(processor, program, ctx);
            expect(ctx.pc).toBe(2);
            expect(getRegister(ctx, registers.t1)).toBe(22);
        });

        it("continua desde el PC existente en el contexto", () => {
            const ctx = createContext();
            const program = createProgram("24080001 24090002 01294820 240A0003 240B0004 240C0005");
            ctx.pc = 5;

            singleCycle(processor, program, ctx);

            expect(ctx.pc).toBe(6);
            expect(getRegister(ctx, registers.t4)).toBe(5);
        });
    });

    describe("Fetch stage", () => {
        it("obtiene la instruccion correcta cuando PC=0", () => {
            const ctx = createContext();
            const program = createProgram("25490001 01294820");
            const decodeSpy = jest.spyOn(processor, "decode");

            singleCycle(processor, program, ctx);

            expect(decodeSpy).toHaveBeenCalledWith(0x25490001, ctx);
        });

        it("obtiene la siguiente instruccion cuando PC=1", () => {
            const ctx = createContext();
            const program = createProgram("25490001 01294820");
            setRegister(ctx, registers.t2, 10);
            const decodeSpy = jest.spyOn(processor, "decode");

            singleCycle(processor, program, ctx);
            singleCycle(processor, program, ctx);

            expect(decodeSpy.mock.calls[1]?.[0]).toBe(0x01294820);
            expect(ctx.pc).toBe(2);
        });

        it("lanza error si no hay instruccion en el PC actual", () => {
            const ctx = createContext();
            const program = createProgram("25490001 01294820 00000000 25290001 2408000F");
            ctx.pc = 1000;

            expect(() => singleCycle(processor, program, ctx)).toThrow("No instruction found at PC (1000)");
        });
    });

    describe("Decode stage", () => {
        it("decodifica correctamente una instruccion I-type", () => {
            const ctx = createContext();
            const program = createProgram("25490001");
            const executeSpy = jest.spyOn(processor, "execute");

            singleCycle(processor, program, ctx);

            expect(executeSpy).toHaveBeenCalledWith({
                op: "ADDIU",
                type: "I",
                operand1: registers.t2,
                operand2: 1,
                target: registers.t1,
            }, ctx);
        });

        it("decodifica correctamente formatos R, I y J", () => {
            const ctx = createContext();
            const program = createProgram("01294820 25490001 08000006");
            const executeSpy = jest.spyOn(processor, "execute");

            singleCycle(processor, program, ctx);
            singleCycle(processor, program, ctx);
            singleCycle(processor, program, ctx);

            expect(executeSpy.mock.calls[0]?.[0]).toMatchObject({ op: "ADD", type: "R" });
            expect(executeSpy.mock.calls[1]?.[0]).toMatchObject({ op: "ADDIU", type: "I" });
            expect(executeSpy.mock.calls[2]?.[0]).toMatchObject({
                op: "J",
                type: "J",
                operand1: 6,
                operand2: 0,
                target: 0,
            });
        });
    });

    describe("Execute stage", () => {
        it("ejecuta una operacion aritmetica", () => {
            const ctx = createContext();
            const program = createProgram("01095020");
            setRegister(ctx, registers.t0, 5);
            setRegister(ctx, registers.t1, 3);

            singleCycle(processor, program, ctx);

            expect(getRegister(ctx, registers.t2)).toBe(8);
        });

        it("ejecuta una operacion logica", () => {
            const ctx = createContext();
            const program = createProgram("01095024");
            setRegister(ctx, registers.t0, 0xff);
            setRegister(ctx, registers.t1, 0x0f);

            singleCycle(processor, program, ctx);

            expect(getRegister(ctx, registers.t2)).toBe(0x0f);
        });
    });

    describe("Memory Access stage", () => {
        it("LW accede a memoria y escribe el valor leido", () => {
            const ctx = createLargeMemoryContext();
            const program = createProgram("8D0B0000");
            ctx.memory.write(0x1000, 0x12345678);
            setRegister(ctx, registers.t0, 0x1000);

            singleCycle(processor, program, ctx);

            expect(getRegister(ctx, registers.t3)).toBe(0x12345678);
            expect(ctx.pc).toBe(1);
        });

        it("SW accede a memoria y almacena el valor", () => {
            const ctx = createLargeMemoryContext();
            const program = createProgram("AD090000");
            setRegister(ctx, registers.t0, 0x1000);
            setRegister(ctx, registers.t1, 0xdeadbeef);

            singleCycle(processor, program, ctx);

            expect(ctx.memory.read(0x1000)).toBe(0xdeadbeef);
            expect(ctx.pc).toBe(1);
        });

        it("una instruccion sin acceso a memoria no modifica la memoria", () => {
            const ctx = createContext();
            const program = createProgram("01095020");
            ctx.memory.write(10, 99);
            setRegister(ctx, registers.t0, 5);
            setRegister(ctx, registers.t1, 3);

            singleCycle(processor, program, ctx);

            expect(ctx.memory.read(10)).toBe(99);
        });
    });

    describe("Write Back stage", () => {
        it("escribe el resultado en el registro destino", () => {
            const ctx = createContext();
            const program = createProgram("01095020");
            setRegister(ctx, registers.t0, 7);
            setRegister(ctx, registers.t1, 4);

            singleCycle(processor, program, ctx);

            expect(getRegister(ctx, registers.t2)).toBe(11);
        });

        it("actualiza correctamente el registro destino en ADDIU", () => {
            const ctx = createContext();
            const program = createProgram("25090005");
            setRegister(ctx, registers.t0, 10);

            singleCycle(processor, program, ctx);

            expect(getRegister(ctx, registers.t1)).toBe(15);
        });

        it("no modifica el registro $zero", () => {
            const ctx = createContext();
            const program = createProgram("2400000A");

            singleCycle(processor, program, ctx);

            expect(getRegister(ctx, registers.zero)).toBe(0);
        });
    });

    describe("Two consecutive cycles", () => {
        it("ejecuta 2 ciclos secuenciales con estado acumulado", () => {
            const ctx = createContext();
            const program = createProgram("25490001 01294820");
            setRegister(ctx, registers.t2, 10);
            setRegister(ctx, registers.t1, 0);

            singleCycle(processor, program, ctx);
            expect(getRegister(ctx, registers.t1)).toBe(11);
            expect(ctx.pc).toBe(1);

            singleCycle(processor, program, ctx);
            expect(getRegister(ctx, registers.t1)).toBe(22);
            expect(ctx.pc).toBe(2);
        });
    });

    describe("Branch instructions (affecting PC)", () => {
        it("BEQ tomado deja pendiente el salto y apunta al target tras la delay slot", () => {
            const ctx = createContext();
            const program = createProgram("11090002 254A0001 00000000 340B0001");
            setRegister(ctx, registers.t0, 5);
            setRegister(ctx, registers.t1, 5);

            singleCycle(processor, program, ctx);

            expect(ctx.pc).toBe(1);
            expect(ctx.delayPending).toBe(true);
            expect(ctx.jumpAddress).toBe(3);
        });

        it("BEQ no tomado avanza secuencialmente sin dejar salto pendiente", () => {
            const ctx = createContext();
            const program = createProgram("11090002 254A0001 00000000 340B0001");
            setRegister(ctx, registers.t0, 5);
            setRegister(ctx, registers.t1, 3);

            singleCycle(processor, program, ctx);

            expect(ctx.pc).toBe(1);
            expect(ctx.delayPending).toBeFalsy();
            expect(ctx.jumpAddress).toBeUndefined();
        });

        it("la instruccion en delay slot se ejecuta siempre en el ciclo siguiente", () => {
            const ctx = createContext();
            const program = createProgram("11090002 254A0001 00000000 340B0001");
            setRegister(ctx, registers.t0, 5);
            setRegister(ctx, registers.t1, 5);
            setRegister(ctx, registers.t2, 0);

            singleCycle(processor, program, ctx);
            singleCycle(processor, program, ctx);

            expect(getRegister(ctx, registers.t2)).toBe(1);
            expect(ctx.delayPending).toBe(false);
            expect(ctx.pc).toBe(3);
        });
    });

    describe("Unconditional jumps (J, BC)", () => {
        it("J deja el salto listo para ejecutarse despues de la delay slot", () => {
            const ctx = createContext();
            const program = createProgram("08000006 24080001 00000000 00000000 00000000 00000000 24090002");

            singleCycle(processor, program, ctx);

            expect(ctx.pc).toBe(1);
            expect(ctx.delayPending).toBe(true);
            expect(ctx.jumpAddress).toBe(24);
        });

        it("BC actualiza el PC inmediatamente", () => {
            const ctx = createContext();
            const program = createProgram("C8000002 24080001 24080002 24090003");

            singleCycle(processor, program, ctx);

            expect(ctx.pc).toBe(3);
            expect(ctx.delayPending).toBeFalsy();
        });
    });

    describe("Real classroom programs - one cycle at a time", () => {
        it("simpleRAMSolved ejecuta correctamente los ciclos 0 a 2", () => {
            const ctx = createContext();
            const program = createProgram(SIMPLE_RAM_SOLVED_HEX);
            setRegister(ctx, registers.t2, 0);

            singleCycle(processor, program, ctx);
            expect(getRegister(ctx, registers.t1)).toBe(1);
            expect(ctx.pc).toBe(1);

            singleCycle(processor, program, ctx);
            expect(getRegister(ctx, registers.t1)).toBe(2);
            expect(ctx.pc).toBe(2);

            singleCycle(processor, program, ctx);
            expect(getRegister(ctx, registers.t1)).toBe(2);
            expect(ctx.pc).toBe(3);
        });

        it("simpleRAMSolved mantiene el estado correcto al avanzar ciclo por ciclo", () => {
            const ctx = createContext();
            const program = createProgram(SIMPLE_RAM_SOLVED_HEX);

            for (let cycle = 0; cycle < 9; cycle++) {
                singleCycle(processor, program, ctx);

                if (cycle === 3) {
                    expect(getRegister(ctx, registers.t1)).toBe(3);
                }

                if (cycle === 4) {
                    expect(getRegister(ctx, registers.t0)).toBe(15);
                }

                if (cycle === 6) {
                    expect(getRegister(ctx, registers.t3)).toBe(6);
                }

                if (cycle === 8) {
                    expect(getRegister(ctx, registers.t4)).toBe(12);
                    expect(getRegister(ctx, registers.t5)).toBe(24);
                    expect(ctx.pc).toBe(9);
                }
            }
        });
    });

    describe("Error handling", () => {
        it("lanza error si PC esta fuera del programa aunque siga dentro de memoria", () => {
            const ctx = createContext();
            const program = createProgram("25490001");
            ctx.pc = 10;

            expect(() => singleCycle(processor, program, ctx)).toThrow("No instruction found at PC (10)");
        });

        it("lanza error si PC es negativo", () => {
            const ctx = createContext();
            const program = createProgram("25490001");
            ctx.pc = -1;

            expect(() => singleCycle(processor, program, ctx)).toThrow("PC (-1) is out of bounds for memory of size 1024");
        });

        it("lanza error para instruccion desconocida", () => {
            const ctx = createContext();
            const program = createProgram("FFFFFFFF");

            expect(() => singleCycle(processor, program, ctx)).toThrow("Unknown instruction");
        });
    });

    describe("State consistency", () => {
        it("modifica el contexto en lugar y conserva el mismo objeto", () => {
            const ctx = createContext();
            const originalCtx = ctx;
            const originalRegisters = ctx.registers;
            const originalMemory = ctx.memory;
            const program = createProgram("25490001");

            singleCycle(processor, program, ctx);

            expect(ctx).toBe(originalCtx);
            expect(ctx.registers).toBe(originalRegisters);
            expect(ctx.memory).toBe(originalMemory);
            expect(ctx.pc).toBe(1);
        });

        it("no modifica el programa durante el ciclo", () => {
            const ctx = createContext();
            const program = createProgram("25490001 01294820");
            const originalProgram = JSON.stringify(program);

            singleCycle(processor, program, ctx);

            expect(JSON.stringify(program)).toBe(originalProgram);
        });
    });

    describe("Timing and performance", () => {
        it("completa un ciclo rapidamente", () => {
            const ctx = createContext();
            const program = createProgram("25490001");

            const start = performance.now();
            singleCycle(processor, program, ctx);
            const end = performance.now();

            expect(end - start).toBeLessThan(10);
        });
    });
});
