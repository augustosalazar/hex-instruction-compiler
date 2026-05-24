export const semantics = {
    ADD(ctx) {
        const a = ctx.registers.read(ctx.rs);
        const b = ctx.registers.read(ctx.rt);

        const result = alu.add(a, b);

        ctx.registers.write(ctx.rd, result);
    },
    SUB(ctx) {
        const a = ctx.registers.read(ctx.rs);
        const b = ctx.registers.read(ctx.rt);

        const result = alu.sub(a, b);

        ctx.registers.write(ctx.rd, result);
    },
    AND(ctx) {
        const a = ctx.registers.read(ctx.rs);
        const b = ctx.registers.read(ctx.rt);

        const result = alu.and(a, b);

        ctx.registers.write(ctx.rd, result);
    },
    OR(ctx) {
        const a = ctx.registers.read(ctx.rs);
        const b = ctx.registers.read(ctx.rt);

        const result = alu.or(a, b);

        ctx.registers.write(ctx.rd, result);
    },
}