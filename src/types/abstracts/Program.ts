// a Program is an array of Instructions. 
// every Compiler is supposed to build its own Program using an input string (space separated hex words)
export interface Program {
    instructions: Instruction[];
}

// the idea is that any given Compiler sorts out these fields as it reads the input string.
// this makes sense because every Compiler architecture reads the programs differently.
export interface Instruction {
    type: string;
    op: string; // ALU operation
    operand1: number;
    operand2: number;
    target: number;
}
