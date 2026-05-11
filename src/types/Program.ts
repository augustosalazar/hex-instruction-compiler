// a Program is an array of Instructions. 
// every Compiler is supposed to build its own Program using an input string (space separated hex words)
export default interface Program {
    words: Instruction[];
}

export interface Instruction {
    value:string;
    op:string;
    operand1:string;
    operand2:string;
    target:string;
}
