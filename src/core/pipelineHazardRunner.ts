import type { Processor, CompileOutput, ExecutionContext, Program } from "../types/abstracts";
import { pipelineHazardCycle, initHazardPipelineState } from "./pipelineHazardCycle";

// ─── Hazard-Aware Pipeline Runner ─────────────────────────────────────────────
//
// Runs the 5-stage pipeline with full data-hazard forwarding (EX/MEM→EX),
// load-use stall insertion, and control-hazard flush (branch/jump).
//
// Delegates each tick to pipelineHazardCycle() — mirrors the relationship
// between singleCycleRunner and singleCycle.

export function pipelineHazardRun(
    processor: Processor,
    program: Program,
    ctx: ExecutionContext,
): CompileOutput {

    let cycles = 0;
    const start = performance.now();
    ctx.pc = 0;

    let state = initHazardPipelineState(processor);
    const history = [];

    while (true) {
        const { next, snapshot } = pipelineHazardCycle(processor, program, ctx, state, cycles);
        history.push(snapshot);
        state = next;
        cycles++;

        if (state.fetchDone
            && !state.ifLatch.valid
            && !state.idLatch.valid
            && !state.exLatch.valid
            && !state.memLatch.valid) break;
    }

    const end = performance.now();
    return { registryState: ctx.registers, time: end - start, cycles, pipelineStates: history };
}
