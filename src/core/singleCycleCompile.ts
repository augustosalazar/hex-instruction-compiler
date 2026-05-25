import type { Compiler, CompileOutput, ExecutionContext, Program, InstructionReturn } from "../types/abstracts";

// correr el Programa dentro del Compilador de manera secuencial
export function singleCycleCompile(
    compiler: Compiler,
    program: Program,
    ctx: ExecutionContext
): CompileOutput {
    while (ctx.pc < program.instructions.length) {

        const x: InstructionReturn = compiler.instructionCycle(program, ctx);

    }

    return {
        registryState: null,
        time: null,
        cycles: null,
    }
}

