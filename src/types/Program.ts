// a Program is an array of Instructions. 
// every Compiler is supposed to build its own Program using an input string (space separated hex words)
export default interface Program {
    words: Instruction[];
}

// the idea is that any given Compiler sorts out these fields as it reads the input string.
// this makes sense because every Compiler architecture reads the programs differently.
export interface Instruction {
    value:string;
    op:string;
    operand1:string;
    operand2:string;
    target:string;
}
