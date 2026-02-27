export interface CodeWriter {
  addIntegers(): CodeWriter;
  askInteger(): CodeWriter;
  askString(): CodeWriter;
  
  drop(): CodeWriter;
  // will have to set SP
  indirectCall(signatureIndex: number): CodeWriter;
  loadInteger(offset: number): CodeWriter;
  multiplyIntegers(): CodeWriter;
  printInteger(): CodeWriter;
  printString(): CodeWriter;
  pushRepresentation(num: number): CodeWriter;
  storeInteger(offset: number): CodeWriter;
  subtractIntegers(): CodeWriter;

  pushStackPointer(): CodeWriter;
};
