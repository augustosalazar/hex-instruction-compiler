export { default as alu } from './hardware/alu';
export { default as MemoryUnit } from './hardware/MemoryUnit';
export { default as RegisterUnit } from './hardware/RegisterUnit';
export { default as MIPSv6Processor } from './MIPSv6Processor';

// ── Single-cycle ──────────────────────────────────────────────────────────────
export { singleCycle } from './singleCycle';
export { singleCycleRun } from './singleCycleRunner';

// ── Basic pipeline (no hazard protection) ────────────────────────────────────
export { pipelineCycle, initBasicPipelineState } from './pipelineCycle';
export { pipelineRun } from './pipelineRunner';

// ── Hazard-aware pipeline (forwarding + stall + flush) ───────────────────────
export { pipelineHazardCycle, initHazardPipelineState } from './pipelineHazardCycle';
export { pipelineHazardRun } from './pipelineHazardRunner';