//Abstract InstructionReturn interface. Every architecture *should* determine its own step-by-step return object
//this is so that the CompileOutput makes sense (./CompileOutput.ts)
//check the ./compilers/MIPS/MIPSReturn.ts for details 
export default interface InstructionReturn {
    status: string
}

