import { FunctionType } from './function_type_build';

/// Defines the "ISA" for Melody
/// The point is to be an intermediary between baseline logic for Melody code
/// and WASM.
export interface CodeWriter {
  /// --- builtin functions parts ---
  askInteger(): CodeWriter;
  askString(): CodeWriter;
  printInteger(): CodeWriter;
  printString(): CodeWriter;

  /// --- ALU/Memory parts ---
  addIntegers(): CodeWriter;
  multiplyIntegers(): CodeWriter;
  subtractIntegers(): CodeWriter;

  /// From memory, takes offset from stack, pushes the loaded value back onto
  /// the stack.
  /// Stack Effect: [] -> []
  loadInteger(): CodeWriter;

  /// Pushes given number as an integer onto the stack
  /// Stack Effect: [] -> [i32]
  pushInteger(num: number): CodeWriter;

  /// Into memory, takes the value on top, then stores to the address as
  /// specified by the next value on the stack.
  ///
  /// Stack Effect: [i32, i32] -> []
  storeInteger(): CodeWriter;

  /// --- function call parts ---

  /// Translates the given (registered) ftype into an index for an indirect call
  /// Following a call the stack maybe assumed to have the return values pushed
  /// onto the stack, and the receiver + parameters consumed.
  ///
  /// Raises if given ftype is not registered.
  ///
  /// WASM: this handles all of the call overhead, including stack pointer
  //        operations
  indirectCall(beingCalled: FunctionType): CodeWriter;

  // TODO this is broken, we must support the fact that ftype index modifiers
  //      are called, presently reassigning indicies will fail to work as
  //      expected
  // such ftype *must* represent a definition that was registered
  /// Raises if given ftype is not registered.
  pushIndexOfRegistered(ftype: FunctionType): CodeWriter;

  /// Must be called before indirect calls are attempted, this marks the size
  /// of the current stack frame.
  withStackFrameSize<T>(size: number, fn: (cw: CodeWriter) => T): T;

  /// --- stack pointer parts ---

  /// Saves the (often used, global) stack pointer, into a dedicated local
  /// Stack Effect: [] -> []
  /// WASM:
  ///  global.get $gSP
  ///  local.set $lSP
  saveStackPointerToLocal(): CodeWriter;

  /// From a dedicated local, restores the (often used, global) stack pointer
  /// Stack Effect: [] -> []
  /// WASM:
  ///  local.get $lSP
  ///  global.set $gSP
  restoreStackPointerToGlobal(): CodeWriter;

  /// Stores the passed parent (receiver) into memory given by:
  /// stack pointer + offset.
  ///
  /// Stack Effect: [] -> []
  /// WASM:
  ///   global.get $gSP
  ///   {if accessIndex != 0}
  ///     i32.const [accessIndex]
  ///     i32.add
  ///   {end}
  ///   local.get $param0
  ///   i32.store
  storeParentPointer(accessIndex: number): CodeWriter;

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
  
  /// Interns and pushes an integer representation of the given string
  /// constant.
  /// Stack Effect: [] => [i32]
  pushLiteralString(str: string): CodeWriter;

  /// --- stack ops parts ---
  
  /// Discards the top of the stack
  /// Stack Effect: [any] -> []
  drop(): CodeWriter;

  /// Duplicates the top of the stack
  /// Stack Effect: [i32] -> [i32, i32]
  /// WASM:
  ///   local.tee $lTmpSwp
  ///   local.get $lTmpSwp
  duplicateTop(): CodeWriter;

  /// Swaps the top two items on the stack using locals as temporaries.
  /// Stack Effect: [] -> []
  /// WASM:
  ///   local.set $swapA
  ///   local.set $swapB
  ///   local.get $swapA
  ///   local.get $swapB
  swapTopTwo(): CodeWriter;
};
