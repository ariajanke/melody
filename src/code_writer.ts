import { ObjectType } from './object_type';

export interface CodeWriter {
  addIntegers(): CodeWriter,
  askInteger(): CodeWriter,
  askString(): CodeWriter,
  printString(): CodeWriter,
  printInteger(): CodeWriter,
  drop(): CodeWriter
  indirectCall(signatureIndex: number): CodeWriter,
  loadInteger(offset: number): CodeWriter,
  multiplyIntegers(): CodeWriter,
  pushFunctionIndex
    (expectedReturnType: ObjectType,
     definer: (codeWriter: CodeWriter) => void): CodeWriter,
  pushRepresentation(num: number): CodeWriter,
  storeInteger(offset: number): CodeWriter,
  subtractIntegers(): CodeWriter,
}
