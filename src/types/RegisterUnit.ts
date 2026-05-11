// register unit simulator type
export default interface RegisterUnit{
    wordSize:number;
    registers: Register[];
}

// registers store values in string
export interface Register {
    value: number;
}