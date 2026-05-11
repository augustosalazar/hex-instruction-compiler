JS library to compile and run hex instructions.

# WORKFLOW OUTLINE

The library is to be used as follows:

    1. The user instances any Compiler class by loading it with a Program. The Compiler constructor expects a single string. Said string is to have a format of space-separated hex values, with or without the '0x' prefix (every hex word is an instruction). The Compiler constructor takes that and instances the Program class with it.

    2. The user then calls one of the following:
        > singleCycleExec()
        > pipelinedExec()
        > pipelinedProtectedExec()
    and passes the Compiler instance as an argument. Whichever one the user calls determines what the output is. Any one of these is a central 'execute()' function.

The output of the library includes the final state of the RegisterUnit, the number of cycles and execution time.

# DEVELOPMENT DETAILS

This library is written in TypeScript. Its unit tests are to be done with jest and ts-jest. It is to be bundled with tsup. 
