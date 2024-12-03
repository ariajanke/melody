import * as wcw from './wasm_compilation/wasm_code_writer';
import * as wc from './wasm_compilation/wasm_compiler';

export type WasmCodeWriter = wcw.WasmCodeWriter;
export const WasmCodeWriter = wcw.WasmCodeWriter;
export type WasmCompiler = wc.WasmCompiler;
export const WasmCompiler = wc.WasmCompiler;
