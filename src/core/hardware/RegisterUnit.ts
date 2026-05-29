import { IRegisterUnit } from "../../types/abstracts";
import { RegisterDefinition } from "../../types/isa/registers-definition.interface";

// register unit simulator type - instanced in main 'compile' function and passed to a Compiler when running
export default class RegisterUnit implements IRegisterUnit {
    private registers;
    private regDef: RegisterDefinition[];

    constructor(regDef: RegisterDefinition[]) {
        this.regDef = regDef;
        this.registers = new Array(regDef.length).fill(0);
    }

    read(index: number): number {
        return this.registers[index];
    }

    write(index: number, value: number) {
        if (index !== 0) {
            this.registers[index] = value >>> 0;
        }
    }
}