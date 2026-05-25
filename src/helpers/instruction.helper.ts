import { InstructionFormat } from "../types/isa";
import { extractBits } from "./bits.helper";

export function decodeByFormat(
    instruction: number,
    format: InstructionFormat
): Record<string, number> {
    const result: Record<string, number> = {};

    for (const [field, range] of Object.entries(format.fields)) {
        result[field] = extractBits(
            instruction,
            range.offset,
            range.size
        );
    }

    return result;
}