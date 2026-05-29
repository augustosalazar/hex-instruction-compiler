## Usage

### Installation

This library is distributed as a CommonJS/ESM dual package. Install it from npm (or link it locally):

```bash
npm install hex-instruction-compiler
# or
pnpm add hex-instruction-compiler
```

### Quick Start

```typescript
import {
    parseHexProgram,
    MIPSv6Processor,
    RegisterUnit,
    MemoryUnit,
    singleCycleRun,
} from 'hex-instruction-compiler';

// 1. Define your MIPS v6 program as a hex string
const hexProgram = "2408000F 240A000F 01284820 01285020";

// 2. Parse it into a Program structure
const program = parseHexProgram(hexProgram);

// 3. Create a processor and execution context
const processor = new MIPSv6Processor();
const registers = new RegisterUnit(new Array(32));
const memory    = new MemoryUnit(32, 1024);
const ctx       = { registers, memory, pc: 0 };

// 4. Run the program
const output = singleCycleRun(processor, program, ctx);

// 5. Inspect results
console.log("Cycles:", output.cycles);
console.log("Time (ms):", output.time);
console.log("$t0:", registers.read(8));   // register index 8 = $t0
```

To use the pipeline runners instead, swap `singleCycleRun` for `pipelineRun` or `pipelineHazardRun` — the call signature is identical:

```typescript
import { pipelineRun, pipelineHazardRun } from 'hex-instruction-compiler';

const out1 = pipelineRun(processor, program, ctx);
const out2 = pipelineHazardRun(processor, program, ctx);
```

---

## Architecture & Functionality

### High-Level Flow

```
hexString
    │
    ▼
parseHexProgram()   →   Program { instructions: number[] }
                                │
                                ▼
              ┌─────────────────────────────────────┐
              │           Runner choice              │
              │  singleCycleRun / pipelineRun /      │
              │  pipelineHazardRun                   │
              └─────────────────┬───────────────────┘
                                │
                    ┌───────────▼──────────────┐
                    │   MIPSv6Processor        │
                    │  ┌────────────────────┐  │
                    │  │ 1. fetch()         │  │
                    │  │ 2. decode()        │  │
                    │  │ 3. execute()       │  │
                    │  │ 4. memoryAccess()  │  │
                    │  │ 5. writeback()     │  │
                    │  └────────────────────┘  │
                    └───────────┬──────────────┘
                                │
                    ┌───────────▼──────────────┐
                    │   CompileOutput           │
                    │  registryState            │
                    │  cycles                   │
                    │  time                     │
                    └──────────────────────────┘
```

### Pipeline Stages

Each call to `singleCycle()` — or one pipeline clock tick — executes these five stages in order:

| Stage | Method | Description |
|---|---|---|
| **IF** Instruction Fetch | `processor.fetch(program, ctx)` | Reads the instruction at `ctx.pc`; advances `pc` (handles delay slots). |
| **ID** Instruction Decode | `processor.decode(word, ctx)` | Extracts opcode/funct/fields; looks up the matching `InstructionDefinition`; returns a normalized `Instruction`. |
| **EX** Execute | `processor.execute(decoded, ctx)` | Runs the instruction's semantic function; may apply forwarded register values. Returns `MemoryOperationExecuteOutput`. |
| **MEM** Memory Access | `processor.memoryAccess(execResult, ctx)` | Performs load (`LW`) or store (`SW`) on `ctx.memory`; passes through non-memory results. |
| **WB** Write-back | `processor.writeback(memResult, ctx)` | Writes the result to the target register, or updates `ctx.pc` for branches/jumps. |

### Inputs and Expected Outputs

#### `parseHexProgram(input: string): Program`

- **Input**: A string of space-separated hex words, with or without the `0x` prefix. Tabs, newlines, and repeated spaces are treated as separators. Empty tokens are ignored.
- **Output**: `{ instructions: number[] }` — each hex word converted to an unsigned 32-bit integer, preserving order.

```typescript
const p = parseHexProgram("0x2408000F 240A000F");
// p.instructions === [0x2408000F, 0x240A000F]
```

#### Runner output — `CompileOutput`

All three runners return a `CompileOutput` object:

```typescript
interface CompileOutput {
    registryState: RegisterUnit;   // final register file
    cycles: number;                // total clock cycles executed
    time: number;                  // wall-clock ms (via performance.now)
    singleCycleStates?: SingleCycleSnapshot[];  // per-cycle history (singleCycleRun)
}
```

#### `ExecutionContext`

Passed to every runner and mutated in place:

```typescript
interface ExecutionContext {
    registers: RegisterUnit;
    memory: MemoryUnit;
    pc: number;
    delayPending?: boolean;   // set internally for delay-slot branches
    jumpAddress?: number;     // target PC stored during delay
}
```

---

## Supported Runners

### `singleCycleRun(processor, program, ctx)`

Executes one instruction per cycle with no pipeline overlap. Safe from data hazards by design. Terminates when `ctx.pc >= program.instructions.length`.

### `pipelineRun(processor, program, ctx)`

Executes the program through a 5-stage pipeline **without** hazard protection. RAW (read-after-write) hazards can produce incorrect results if back-to-back dependent instructions are present without NOPs in between.

### `pipelineHazardRun(processor, program, ctx)`

Executes through the same 5-stage pipeline **with**:

- **Register forwarding** — forwards EX/MEM and MEM/WB results directly to the EX stage input, eliminating most RAW hazards.
- **Load-use stall** — inserts a bubble when a `LW` result is consumed in the immediately following instruction.
- **Branch/jump flush** — flushes in-flight instructions when a branch or jump is resolved.

The cycle count from `pipelineHazardRun` is always greater than the raw instruction count because of the pipeline fill/drain overhead (4 extra cycles minimum) plus any stall cycles inserted.

---

## ALU — Supported Instructions

### R-type (opcode = 0, differentiated by `funct` and `shamt`)

| Mnemonic | funct | shamt | Operation |
|---|---|---|---|
| `NOP` | 0 | 0 | No operation |
| `ADD` | 32 | — | Signed 32-bit addition |
| `ADDU` | 33 | — | Unsigned 32-bit addition (wraps) |
| `SUB` | 34 | — | Signed 32-bit subtraction |
| `SUBU` | 35 | — | Unsigned 32-bit subtraction (wraps) |
| `MUL` | 24 | 2 | Signed multiply, low 32 bits |
| `MUH` | 24 | 3 | Signed multiply, high 32 bits |
| `MULU` | 25 | 2 | Unsigned multiply, low 32 bits |
| `MUHU` | 25 | 3 | Unsigned multiply, high 32 bits |
| `DIV` | 26 | 2 | Signed integer division |
| `MOD` | 26 | 3 | Signed modulo |
| `DIVU` | 27 | 2 | Unsigned integer division |
| `MODU` | 27 | 3 | Unsigned modulo |
| `AND` | 36 | — | Bitwise AND |
| `OR` | 37 | — | Bitwise OR |
| `XOR` | 38 | — | Bitwise XOR |
| `NOR` | 39 | — | Bitwise NOR |
| `SLT` | 42 | — | Set if less than (signed) |

### I-type (differentiated by `opcode`)

| Mnemonic | opcode | Operation |
|---|---|---|
| `ADDIU` | 9 | Add immediate unsigned |
| `ANDI` | 12 | AND immediate |
| `ORI` | 13 | OR immediate |
| `XORI` | 14 | XOR immediate |
| `SLTI` | 10 | Set if less than immediate (signed) |
| `SLTIU` | 11 | Set if less than immediate (unsigned) |
| `LW` | 35 | Load word from memory |
| `SW` | 43 | Store word to memory |
| `BEQ` | 4 | Branch if equal (has delay slot) |
| `BNE` | 5 | Branch if not equal (has delay slot) |
| `BLTZ` | 1 | Branch if less than zero (has delay slot) |
| `BGTZC` | 23 | Branch if greater than zero (compact, no delay slot) |
| `BLEZC` | 22 | Branch if less than or equal to zero (compact) |
| `BLEZALC` | 6 | Branch if ≤ 0 and link |
| `BGTZALC` | 7 | Branch if > 0 and link |
| `BEQZALC` | 8 | Branch if = 0 and link |
| `BNEZALC` | 24 | Branch if ≠ 0 and link |

### J-type (differentiated by `opcode`)

| Mnemonic | opcode | Operation |
|---|---|---|
| `J` | 2 | Unconditional jump (has delay slot) |
| `BC` | 50 | Compact unconditional branch (no delay slot) |

---

## Auxiliary Functions

### `parseHexProgram(input: string): Program`
*`src/helpers/parser.helper.ts`*

Splits the input on any whitespace, filters empty tokens, and converts each hex string to an unsigned 32-bit number with `>>> 0`.

### `extractBits(word: number, offset: number, size: number): number`
*`src/helpers/bits.helper.ts`*

Extracts a bit field from a 32-bit word: shifts right by `offset` and masks with `(1 << size) - 1`. Used by the decoder to pull opcode, funct, rs, rt, rd, shamt, and immediate fields.

### `decodeByFormat(word: number, format: InstructionFormat): DecodedFields`
*`src/helpers/instruction.helper.ts`*

Iterates over the field descriptors in an `InstructionFormat` (R, I, or J), calls `extractBits` for each, and returns the raw field map that `format.mapFields()` then converts to the generic `Instruction` shape.

### `alu` object
*`src/core/hardware/alu.ts`*

Provides named methods for all arithmetic and logical operations. Each method receives two numbers and returns a number or throws on division by zero:

```typescript
alu.add(a, b)    alu.sub(a, b)    alu.mul(a, b)    alu.div(a, b)
alu.addu(a, b)   alu.subu(a, b)   alu.mulu(a, b)   alu.divu(a, b)
alu.muh(a, b)    alu.muhu(a, b)   alu.mod(a, b)    alu.modu(a, b)
alu.and(a, b)    alu.or(a, b)     alu.xor(a, b)    alu.nor(a, b)
alu.slt(a, b)    alu.sltu(a, b)
```

### `RegisterUnit`
*`src/core/hardware/RegisterUnit.ts`*

A 32-entry MIPS register file. Writes are stored as unsigned 32-bit values (`>>> 0`). Register 0 (`$zero`) always returns 0 and silently ignores writes.

```typescript
const ru = new RegisterUnit(new Array(32));
ru.read(8);       // read $t0
ru.write(8, 15);  // write $t0 = 15
```

### `MemoryUnit`
*`src/core/hardware/MemoryUnit.ts`*

A bounded word-addressed memory backed by `Uint32Array`. Throws `Error("Address out of bounds")` on invalid reads/writes. Throws `Error("Memory must have at least one address")` if constructed with `addresses <= 0`.

```typescript
const mem = new MemoryUnit(32, 1024); // 32-bit words, 1024 addresses
mem.write(0, 42);
mem.read(0); // 42
```

---

## Adding a New ISA

The processor is ISA-agnostic. All MIPS-specific knowledge lives under `src/isa/mipsv6/`. To add a new ISA (e.g., RISC-V, a custom toy ISA):

### Step 1 — Define instruction formats

Create `src/isa/<isa-name>/formats.ts` following the `InstructionFormat` interface from `src/types/isa.ts`. Each format declares its bit-field descriptors and a `mapFields` function that maps raw field values to the generic `{ type, operand1, operand2, target }` shape.

### Step 2 — Define instruction table

Create `src/isa/<isa-name>/instructions.ts`. For each instruction, declare an `InstructionDefinition` with:
- `semantic` — a unique string key (e.g., `"ADD"`)
- `format` — one of the format objects from Step 1
- `pattern` — the opcode, funct, and/or shamt fields that identify this encoding

Export them all in an `INSTRUCTION_DEFINITIONS` array.

### Step 3 — Implement semantics

Create `src/isa/<isa-name>/semantics.ts`. Export a `semantics` object keyed by the same strings used in `semantic` above. Each value is a function:

```typescript
(decoded: Instruction, ctx: ExecutionContext) => MemoryOperationExecuteOutput
```

The return value tells the MEM and WB stages what to do: write a register (`aluResult`, `targetRegister`), access memory (`storeValue`, `isLoad`), or jump (`hasJump`, `hasDelay`, `aluResult` as jump address).

### Step 4 — Implement pipeline helpers (required for pipeline runners)

Create `src/isa/<isa-name>/pipeline-helpers.ts` and export:
- `getReadRegisters(decoded: Instruction): number[]` — registers read by this instruction
- `getWriteRegister(decoded: Instruction): number | undefined` — register written (if any)
- `isLoadInstruction(decoded: Instruction): boolean` — true for load instructions
- A NOP instruction constant

### Step 5 — Create the Processor class

Create a new class that `implements Processor` (from `src/types/abstracts.ts`) and wires your format, instruction table, semantics, and pipeline helpers together — following `src/core/MIPSv6Processor.ts` as a reference.

### Step 6 — Export from the library

Add your new processor and ISA exports to `src/index.ts`. The existing runners (`singleCycleRun`, `pipelineRun`, `pipelineHazardRun`) are ISA-agnostic and will work as-is with any `Processor` implementor.

---

## Other Important Notes

- **`performance.now()`** is used for timing. In Node.js this requires the global to be available (it is in Node 16+).
- **`>>> 0`** is used throughout to keep 32-bit unsigned semantics in JavaScript.
- **Delay slots**: Classic MIPS branches (`BEQ`, `BNE`, `BLTZ`, `J`) have a delay slot — the instruction immediately after the branch is always executed before the branch takes effect. Compact branches (`BC`, `BGTZC`, `BLEZC`) have no delay slot.
- **Unknown instructions**: The decoder throws `Error("Unknown instruction: opcode X, funct Y, shamt Z")` when no `InstructionDefinition` matches the raw word.
- **Out-of-bounds PC**: `fetch()` throws `Error("PC (N) is out of bounds for memory of size M")` if the PC is outside the memory range.
