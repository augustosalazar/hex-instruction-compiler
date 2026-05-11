import type RegisterUnit from "./RegisterUnit";

export default interface ExecOutput {
    registryState: RegisterUnit | null,
    cycles: number | null,
    time: number | null
}