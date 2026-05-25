export default class alu {

    static add(a: number, b: number): number {
        //Se convierte a enteros con signo de 32 bits con '| 0'
        const signedA = a | 0;
        const signedB = b | 0;

        return (signedA + signedB) | 0;
    }

    static sub(a: number, b: number): number {
        //Se convierte a enteros con signo de 32 bits con '| 0'
        const signedA = a | 0;
        const signedB = b | 0;

        return (signedA - signedB) | 0;
    }

    static and(a: number, b: number): number {
        return a & b;
    }

    static or(a: number, b: number): number {
        return a | b;
    }

    static div(a: number, b: number): number {
        if (b == 0) {
            throw new Error("Division by zero");
        }

        //Se convierten a enteros con signo de 32 bits con '| 0'
        const signedA = a | 0;
        const signedB = b | 0;

        //El '| 0' final final trunca los decimales a cero y asegura que sea un entero de 32bits
        return (signedA / signedB) | 0;
    }

    static mod(a: number, b: number): number {
        if (b == 0) {
            throw new Error("Division by zero");
        }

        //Se convierte a enteros con signo de 32 bits con '| 0'
        const signedA = a | 0;
        const signedB = b | 0;

        //El '| 0' final final trunca los decimales a cero y asegura que sea un entero de 32bits
        return (signedA % signedB) | 0;
    }

    static divu(a: number, b: number): number {
        if (b == 0) {
            throw new Error("Division by zero");
        }

        //Se convierte a enteros sin signo de 32 bits con '>>> 0'
        const unsignedA = a >>> 0;
        const unsignedB = b >>> 0;

        //El '| 0' final final trunca los decimales a cero y asegura que sea un entero de 32bits
        return (unsignedA / unsignedB) >>> 0;
    }

    static modu(a: number, b: number): number {
        if (b == 0) {
            throw new Error("Division by zero");
        }

        //Se convierte a enteros sin signo de 32 bits con '>>> 0'
        const unsignedA = a >>> 0;
        const unsignedB = b >>> 0;

        //El '| 0' final final trunca los decimales a cero y asegura que sea un entero de 32bits
        return (unsignedA % unsignedB) >>> 0;
    }

    static mul(a: number, b: number): number {
        //Se convierten a enteros con signo de 32 bits con '| 0'
        //Se usa BigInt porque la multiplicación puede exceder el rango de un entero de 32 bits
        const signedA = BigInt(a | 0);
        const signedB = BigInt(b | 0);

        //Se multiplica y se trunca a 32 bits usando BigInt.asIntN
        return Number(BigInt.asIntN(32, signedA * signedB));
    }

    static muh(a: number, b: number): number {
        //Se convierten a enteros con signo de 32 bits con '| 0'
        //Se usa BigInt porque la multiplicación puede exceder el rango de un entero de 32 bits
        const signedA = BigInt(a | 0);
        const signedB = BigInt(b | 0);

        //Se realiza el desplazamiento a la derecha para obtener los 32 bits superiores
        const highBits = (signedA * signedB) >> 32n;

        return Number(highBits);
    }

    static mulu(a: number, b: number): number {
        //Se convierten a enteros sin signo de 32 bits con '>>> 0'
        //Se usa BigInt porque la multiplicación puede exceder el rango de un entero de 32 bits
        const unsignedA = BigInt(a >>> 0);
        const unsignedB = BigInt(b >>> 0);

        //Se multiplica y se trunca a 32 bits usando BigInt.asUintN
        return Number(BigInt.asUintN(32, unsignedA * unsignedB));
    }

    static mulhu(a: number, b: number): number {
        //Se convierten a enteros sin signo de 32 bits con '>>> 0'
        //Se usa BigInt porque la multiplicación puede exceder el rango de un entero de 32 bitss
        const unsignedA = BigInt(a >>> 0);
        const unsignedB = BigInt(b >>> 0);

        //Se realiza el desplazamiento a la derecha para obtener los 32 bits superiores
        const highBits = (unsignedA * unsignedB) >> 32n;

        return Number(highBits);
    }

    static xor(a: number, b: number): number {
        return a ^ b;
    }

    static slt(a: number, b: number): number {
        //Se convierte a enteros con signo de 32 bits con '| 0'
        const signedA = a | 0;
        const signedB = b | 0;

        return signedA < signedB ? 1 : 0;
    }

    static sltu(a: number, b: number): number {
        //Se convierte a enteros sin signo de 32 bits con '>>> 0'
        const unsignedA = a >>> 0;
        const unsignedB = b >>> 0;

        return unsignedA < unsignedB ? 1 : 0;
    }

    static addu(a: number, b: number): number {
        //Se convierte a enteros sin signo de 32 bits con '>>> 0'
        const unsignedA = a >>> 0;
        const unsignedB = b >>> 0;

        return unsignedA + unsignedB;
    }

    static subu(a: number, b: number): number {
        //Se convierte a enteros sin signo de 32 bits con '>>> 0'
        const unsignedA = a >>> 0;
        const unsignedB = b >>> 0;

        return unsignedA - unsignedB;
    }
}