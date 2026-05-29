// Per-instruction snapshot emitted by singleCycleRunner.
// Mirrors PipelineCycleSnapshot at the single-cycle level so all runners
// return a consistent history structure in CompileOutput.
export interface SingleCycleSnapshot {
    cycle: number;
    pc: number;
}
