//very similar to RegisterUnit
export default class MemoryUnit {
    wordSize: number;
    wordCount: number;
    words: Word[];

    constructor(wordSize: number, wordCount: number) {
        this.wordSize = wordSize;
        this.wordCount = wordCount;
        this.words = new Array(this.wordCount).fill(0);
    }
}

export interface Word {
    value: number;
}