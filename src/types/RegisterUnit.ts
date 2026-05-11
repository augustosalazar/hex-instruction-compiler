// register unit simulator type
export default interface RegisterUnit{
    wordSize:number;
    registers: Register[];
}

// registers store values in number but TODO: figure out if that even works
export interface Register {
    value: number;
}