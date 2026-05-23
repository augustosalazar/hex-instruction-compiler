import type Compiler from "../types/abstracts/Compiler";
import type CompileOutput from "../types/abstracts/CompileOutput";

// correr el Programa dentro del Compilador de manera secuencial
export function singleCycleCompile(compiler: Compiler, savePipelineState: boolean): CompileOutput {
    var output: CompileOutput = { registryState: null, time: null, cycles: null };

    return output;
}