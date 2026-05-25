import { Word } from "./word.type";

//very similar to RegisterUnit
export default class MemoryUnit {
    readonly wordSize: number;
    readonly addresses: number;

    private words: Uint32Array;

    constructor(wordSize: number, addresses: number) {
        if (addresses < 1) throw new Error("Memory must have at least one address");

        this.wordSize = wordSize;
        this.addresses = addresses;

        this.words = new Uint32Array(addresses).fill(0);
    }

    read(address: number): Word {
        if (address >= this.addresses || address < 0) {
            throw new Error("Address out of bounds");
        }
        return this.words[address]!;
    }

    write(address: number, value: Word) {
        if (address >= this.addresses || address < 0) {
            throw new Error("Address out of bounds");
        }
        this.words[address] = value;
    }
}