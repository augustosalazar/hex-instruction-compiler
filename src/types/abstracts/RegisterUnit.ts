// register unit simulator type - instanced in main 'compile' function and passed to a Compiler when running
export default class RegisterUnit {
    wordSize: number;
    regCount: number;
    registers: Register[];

    constructor(wordSize: number, regCount: number) {
        this.wordSize = wordSize;
        this.regCount = regCount;
        this.registers = new Array(this.regCount).fill(0);
    }
}

// registers store values in number but TODO: figure out if that even works
export interface Register {
    value: number;
}