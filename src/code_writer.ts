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

  /// Takes SP + offset from memory, pushes value onto the stack
  /// Stack Effect: [] -> [i32]
  loadInteger(offset: number): CodeWriter;

  multiplyIntegers(): CodeWriter;
  printInteger(): CodeWriter;
  printString(): CodeWriter;
  pushRepresentation(num: number): CodeWriter;

  /// Stores the top of the stack to SP + offset
  /// Stack Effect: [i32] -> []
  storeInteger(offset: number): CodeWriter;
  subtractIntegers(): CodeWriter;

  /// back and forth between local and global SP
  /// Stack Effect: [] -> []
  forStackPointer(option: 'saveToLocal' | 'restoreToGlobal'): CodeWriter;

  // fixed offset (0) from SP
  // Stack Effect: [] -> []
  storeParentStackPointer(): CodeWriter;

  /// Increments the stack pointer with the top of the stack
  /// Stack Effect: [i32] -> []
  incrementStackPointer(): CodeWriter;

  /// Pushes the current stack pointer onto the stack
  /// Stack Effect: [] -> [i32]
  pushStackPointer(): CodeWriter;

  // /// From absolute address, into loaded value on top
  // /// Stack Effect: [i32] -> [i32]
  // absoluteLoadInteger(): CodeWriter;

  // /// raw store.i32 expects datum on top, then address
  // /// Stack Effect: [i32, i32] -> []
  // absoluteStoreInteger(): CodeWriter;
};
