/// Defines the "ISA" for Melody
/// Similar to WASM, but simplified
export interface CodeWriter {
  addIntegers(): CodeWriter;
  askInteger(): CodeWriter;
  askString(): CodeWriter;

  /// Discards the top of the stack
  /// Stack Effect: [i32] -> []
  drop(): CodeWriter;

  // will have to set SP
  indirectCall(signatureIndex: number): CodeWriter;

  /// ~Takes SP + offset from memory, pushes value onto the stack~
  /// Basic WASM instruction: from memory, takes offset from stack, pushes 
  /// value onto the stack
  /// Stack Effect: [] -> [i32]
  loadInteger(): CodeWriter;

  multiplyIntegers(): CodeWriter;
  printInteger(): CodeWriter;
  printString(): CodeWriter;

  /// Stack Effect: [] -> [i32]
  pushRepresentation(num: number): CodeWriter;

  /// ~Stores the top of the stack to SP + offset~
  /// Basic WASM instruction: onto memory, takes the value on top, then stores
  /// to the address as specified by the next value on the stack
  /// Stack Effect: [i32, i32] -> []
  storeInteger(): CodeWriter;

  subtractIntegers(): CodeWriter;

  /// back and forth between local and global SP
  /// Stack Effect: [] -> []
  /// WASM:
  ///   for 'saveToLocal':
  ///     global.get $gSP
  ///     local.set $lSP
  ///   for 'restoreToGlobal':
  ///     local.get $lSP
  ///     global.set $gSP
  forStackPointer(option: 'saveToLocal' | 'restoreToGlobal'): CodeWriter;

  /// fixed offset (0) from SP
  /// Stack Effect: [] -> []
  /// WASM:
  ///  global.get $gSP
  ///  local.get $param0
  ///  i32.store
  storeParentStackPointer(): CodeWriter;

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

  /// Duplicates the top of the stack
  /// Stack Effect: [i32] -> [i32, i32]
  /// WASM:
  ///   local.tee $lTmpSwp
  ///   local.get $lTmpSwp
  duplicateTop(): CodeWriter;
};
