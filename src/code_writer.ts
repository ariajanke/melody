import { FunctionType } from './function_type_build';

/// Defines the "ISA" for Melody
/// The point is to be an intermediary between baseline logic for Melody code
/// and WASM.
/// [try not to speak WASM, but rather an inbetween, ftypes shouldn't concern themselves with "i32s"]
export interface CodeWriter {
  /// --- builtin parts ---
  askInteger(): CodeWriter;
  askString(): CodeWriter;
  printInteger(): CodeWriter;
  printString(): CodeWriter;

  /// --- ALU/Memory parts ---
  
  addIntegers(): CodeWriter;
  multiplyIntegers(): CodeWriter;
  subtractIntegers(): CodeWriter;

  /// ~Takes SP + offset from memory, pushes value onto the stack~
  /// Basic WASM instruction: from memory, takes offset from stack, pushes 
  /// value onto the stack
  /// Stack Effect: [] -> [i32]
  loadInteger(): CodeWriter;

  /// Stack Effect: [] -> [i32]
  // pushRepresentation(num: number): CodeWriter;
  pushInteger(num: number): CodeWriter;

  /// ~Stores the top of the stack to SP + offset~
  /// Basic WASM instruction: onto memory, takes the value on top, then stores
  /// to the address as specified by the next value on the stack
  /// Stack Effect: [i32, i32] -> []
  storeInteger(): CodeWriter;

  /// --- function call parts ---

  // will have to set SP
  // indirectCall(signatureIndex: number): CodeWriter;
  indirectCall(beingCalled: FunctionType): CodeWriter;
  withStackFrameSize<T>(size: number, fn: (cw: CodeWriter) => T): T;

  /// --- stack pointer parts ---
  /// back and forth between local and global SP
  /// Stack Effect: [] -> []
  /// WASM:
  ///   for 'saveToLocal':
  ///     global.get $gSP
  ///     local.set $lSP
  saveStackPointerToLocal(): CodeWriter;
  ///   for 'restoreToGlobal':
  ///     local.get $lSP
  ///     global.set $gSP
  restoreStackPointerToGlobal(): CodeWriter;
  // forStackPointer(option: 'saveToLocal' | 'restoreToGlobal'): CodeWriter;
  

  /// fixed offset (0) from SP
  /// Stack Effect: [] -> []
  /// WASM:
  ///  global.get $gSP
  ///  {if accessIndex != 0}
  ///    i32.const [accessIndex]
  ///    i32.add
  ///  {end}
  ///  local.get $param0
  ///  i32.store
  storeParentPointer(accessIndex: number): CodeWriter;

  // /// Increments the stack pointer with the top of the stack
  // /// Expectation: must first call pushRepresentation with current frame size
  // /// Stack Effect: [i32] -> []
  // /// WASM:
  // ///   global.get $gSP
  // ///   i32.add
  // ///   global.set $gSP
  // incrementStackPointer(): CodeWriter;

  /// Sets the stack pointer with the value at the current top of the stack
  /// Stack Effect: [i32] -> []
  /// WASM:
  ///   global.set $gSP
  setStackPointer(): CodeWriter;

  /// Pushes the current stack pointer onto the stack
  /// Essential for `<context>`
  /// Stack Effect: [] -> [i32]
  /// WASM:
  ///   global.get $gSP
  pushStackPointer(): CodeWriter;

  /// --- string parts ---
  
  pushLiteralString(str: string): CodeWriter;

  /// --- stack ops parts ---
  
  /// Discards the top of the stack
  /// Stack Effect: [i32] -> []
  drop(): CodeWriter;

  /// Duplicates the top of the stack
  /// Stack Effect: [i32] -> [i32, i32]
  /// WASM:
  ///   local.tee $lTmpSwp
  ///   local.get $lTmpSwp
  duplicateTop(): CodeWriter;

  // TODO
  swapTopTwo(): CodeWriter;
};
