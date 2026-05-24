/*

import type { ExecutionContext } from "../../types/abstracts";
import { alu } from "../../core";

export const semantics = {
    ADD(ctx: ExecutionContext) {
        const a = ctx.state.registers.read(ctx.rs);
        const b = ctx.state.registers.read(ctx.rt);

        const result = alu.add(a, b);

        ctx.state.registers.write(ctx.rd, result);
    },
    SUB(ctx: ExecutionContext) {
        const a = ctx.state.registers.read(ctx.rs);
        const b = ctx.state.registers.read(ctx.rt);

        const result = alu.sub(a, b);

        ctx.state.registers.write(ctx.rd, result);
    },
    AND(ctx: ExecutionContext) {
        const a = ctx.state.registers.read(ctx.rs);
        const b = ctx.state.registers.read(ctx.rt);

        const result = alu.and(a, b);

        ctx.state.registers.write(ctx.rd, result);
    },
    OR(ctx: ExecutionContext) {
        const a = ctx.state.registers.read(ctx.rs);
        const b = ctx.state.registers.read(ctx.rt);

        const result = alu.or(a, b);

        ctx.registers.write(ctx.rd, result);
    },
}

*/