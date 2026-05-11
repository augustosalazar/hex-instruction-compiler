import type Compiler from "../types/Compiler";
import type ExecOutput from "../types/ExecOutput";

export function singleCycleCompile(compiler:Compiler):ExecOutput{
    var output:ExecOutput = {registryState:null, time:null, cycles:null};
    return output;
}