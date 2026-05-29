import { singleCycleRun, MIPSv6Processor, RegisterUnit, MemoryUnit, parseHexProgram, mipsv6Registers as registers } from "./index";

/**
 * Demo ejecutable de la libreria hex-instruction-compiler.
 *
 * Este archivo no es una prueba Jest. Es un ejemplo de uso real que muestra el
 * flujo completo para ejecutar un programa MIPS v6 escrito en hexadecimal:
 * 1. Parsear el string hexadecimal con parseHexProgram.
 * 2. Crear un procesador MIPSv6Processor.
 * 3. Crear el contexto de ejecucion con registros, memoria y PC inicial.
 * 4. Ejecutar el programa completo con singleCycleRun.
 * 5. Imprimir ciclos, tiempo y registros finales relevantes.
 *
 * Para ejecutarlo desde la raiz del proyecto:
 *
 * npx tsx src/demo.ts
 */
console.log("=== MIPS v6 Processor Demo ===\n");

// Programa de clase usado para validar ejecucion completa y registros finales.
const hexProgram = "25490001 01294820 00000000 25290001 2408000F 240A000F 01295820 016B6020 018C6820";

// Convierte el string de instrucciones hexadecimales en Program { instructions }.
const program = parseHexProgram(hexProgram);

// Instancia el procesador y el estado inicial de la simulacion.
const processor = new MIPSv6Processor();
const ctx = {
    registers: new RegisterUnit(new Array(32)),
    memory: new MemoryUnit(32, 1024),
    pc: 0
};

console.log("Program Instructions:", program.instructions.map(i => `0x${i.toString(16).padStart(8, "0")}`));
console.log("Starting execution...\n");

// Ejecuta todas las instrucciones hasta que el PC alcance el final del programa.
const result = singleCycleRun(processor, program, ctx);

console.log("=== Execution Complete ===");
console.log(`Cycles: ${result.cycles}`);
console.log(`Time: ${result.time.toFixed(3)}ms`);
console.log("\n=== Final Register States ===");

// Muestra los registros que el programa modifica o usa como resultados finales.
console.log(`$t0 ($8) = ${ctx.registers.read(registers.t0)}`);
console.log(`$t1 ($9) = ${ctx.registers.read(registers.t1)}`);
console.log(`$t2 ($10) = ${ctx.registers.read(registers.t2)}`);
console.log(`$t3 ($11) = ${ctx.registers.read(registers.t3)}`);
console.log(`$t4 ($12) = ${ctx.registers.read(registers.t4)}`);
console.log(`$t5 ($13) = ${ctx.registers.read(registers.t5)}`);
