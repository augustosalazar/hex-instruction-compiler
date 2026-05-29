import { PipelineCycleSnapshot } from "./StageContext";
import { SingleCycleSnapshot } from "./SingleCycleSnapshot";
import { IRegisterUnit } from "./IRegisterUnit";

// The return type for every main runner function (singleCycleRun, pipelineRun, pipelineHazardRun).

export interface CompileOutput {
    registryState: IRegisterUnit | null;
    cycles: number | null;
    time: number | null;
    /** Cycle-by-cycle pipeline state. Populated by pipelineRun and pipelineHazardRun. */
    pipelineStates?: PipelineCycleSnapshot[];
    /** Per-instruction snapshots. Populated by singleCycleRun. */
    singleCycleStates?: SingleCycleSnapshot[];
}