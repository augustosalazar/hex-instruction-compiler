// Abstract interface for any register bank implementation.
// Decouples CompileOutput and Processor from the concrete RegisterUnit class.
export interface IRegisterUnit {
    read(index: number): number;
    write(index: number, value: number): void;
}
