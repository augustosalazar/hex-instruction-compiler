# hex-instruction-compiler

A TypeScript library for compiling, decoding, and simulating MIPS v6 hexadecimal instruction programs. Supports single-cycle execution, basic pipelined execution, and hazard-aware pipelined execution with forwarding and stall detection.

## Overview

`hex-instruction-compiler` takes a space-separated string of hexadecimal instruction words and runs them through a MIPS v6 processor model. The library exposes a clean public API so consumers can:

1. **Parse** a hex program string into a `Program` structure.
2. **Choose a runner** — single-cycle, basic pipeline, or hazard-aware pipeline.
3. **Inspect the output** — final register state, cycle count, and execution time.

The processor model implements the classic five-stage pipeline: **Fetch → Decode → Execute → Memory Access → Write-back**. The hazard-aware runner additionally handles RAW data hazards through register forwarding and pipeline stalls, and clears in-flight instructions on branches/jumps.

Supported runners at a glance:

| Runner | Function | Description |
|---|---|---|
| Single-cycle | `singleCycleRun` | One instruction per cycle, no pipeline overlap |
| Basic pipeline | `pipelineRun` | Five-stage pipeline, no hazard protection |
| Hazard-aware pipeline | `pipelineHazardRun` | Pipeline with forwarding, stalls, and flush |

---

## Development Team

### Developers

Juan Borja  
Samuel Camargo  
Fatima Castro  
Juan Rojas  

### QA / Testing

Oscar Gil  
Jean Marthe  
Alberto Niebles  
Valentina Schotborgh  

---

## Documentation

- [DOCS.md](DOCS.md)
- [TESTING.md](TESTING.md)
---

## Credits

This project was developed under the guidance and support of **Augusto Salazar Silva**.
