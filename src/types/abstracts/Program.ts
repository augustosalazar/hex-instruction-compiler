// a Program is an array of raw 32-bit hex words (numbers). 
// The parser converts the input string (space separated hex words) into this array.
export interface Program {
    instructions: number[]; 
}

// The output of the Decode stage. 
// Every architecture will map its bits into these generic fields for the Execute stage.
export interface Instruction {
    type: string;
    op: string; // ALU operation
    operand1: number;
    operand2: number;
    target: number;
}
