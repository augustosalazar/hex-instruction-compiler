import type { Program } from "../types/abstracts";

export function parseHexProgram(hexString: string): Program {
    const instructions: number[] = hexString
        .trim()
        .split(/\s+/)
        .filter(word => word.length > 0)
        .map(word => {
            const cleanWord = word.startsWith('0x') ? word.substring(2) : word;
            return parseInt(cleanWord, 16) >>> 0;
        });

    return { instructions };
}
