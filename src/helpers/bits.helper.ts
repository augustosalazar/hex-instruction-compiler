import { Word } from "../types/abstracts";

export function toUint32(x: number): Word {
    return x >>> 0;
}

export function extractBits(
    word: Word,
    offset: number,
    size: number
): number {
    return (word >>> offset) & ((1 << size) - 1);
}

export function signExtend(word: Word) {
    return word | 0;
}

export function toHex(word: Word): string {
    return "0x" + word.toString(16).padStart(8, "0");
}