import type { Processor, CompileOutput, ExecutionContext, Program } from "../types/abstracts";
import { pipelineCycle, initBasicPipelineState } from "./pipelineCycle";

// ─── Basic Pipeline Runner ────────────────────────────────────────────────────
//
// Runs all 5 stages in parallel each cycle with no stalls or forwarding.
// Delegates each tick to pipelineCycle() — mirrors the relationship between
// singleCycleRunner and singleCycle.

export function pipelineRun(
    processor: Processor,
    program: Program,
    ctx: ExecutionContext,
): CompileOutput {

    let cycles = 0;
    const start = performance.now();
    let state = initBasicPipelineState(processor);
    const history = [];

    while (true) {
        const { next, snapshot } = pipelineCycle(processor, program, ctx, state, cycles);
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