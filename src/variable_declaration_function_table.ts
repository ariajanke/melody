import { type FunctionLookUpTable } from './function_look_up_table';
import {
  BuiltInFunction,
  CallHandlingStrategies,
  CallingContext,
  IncompleteFunctionType,
  type FunctionType,
} from './function_type';
import { Helpers } from './helpers';
import { ObjectType } from './object_type';
import { type CodeWriter } from './code_writer';

const { freeze, memoize } = Helpers;

export interface VariableDeclarationFunctionTable extends FunctionLookUpTable {
  offset(): number
};

const kBytesPerWord = 4;

function construct(mVarType: ObjectType, mOperator: string, mMemoryOffset: number) {
  const mGetter = () => makeGetter(mVarType, mMemoryOffset);
  const mSetter = (() => {
    if (mOperator !== ':=')
      { return undefined; }
    return makeSetter(mGetter(), mVarType, mMemoryOffset);
  });
  const mUidToMethodTable = memoize(():
    { [uid: symbol]: FunctionType | undefined } =>
  freeze({
    [ObjectType.emptyTupleInstance().uid()]: mGetter(),
    [mVarType.uid()]: mSetter()
  }));
  return freeze({
    offset: () => mMemoryOffset,
    byParameters: (param: ObjectType): FunctionType | undefined =>
      mUidToMethodTable()[param.uid()],
    variableType: mVarType
  }) satisfies VariableDeclarationFunctionTable;
}

function makeGetter(varType: ObjectType, memoryOffset: number) {
  return IncompleteFunctionType.
    make().
    setCallStrategy(CallHandlingStrategies.noReceiver).
    setParameters(ObjectType.emptyTupleInstance()).
    setReturns(varType).
    setBuiltin((callingContext: CallingContext, writer: CodeWriter) =>
    {
      if (!callingContext.canTake(varType)) {
        return;
      }
      forEachWordIn(varType, (additional: number) => {
        writer.loadInteger(memoryOffset + additional*kBytesPerWord);
      });
    }).
    finish();
}

function makeSetter(getter: FunctionType, varType: ObjectType, memoryOffset: number) {
  return IncompleteFunctionType.
    make().
    setCallStrategy(CallHandlingStrategies.noReceiver).
    setParameters(varType).
    setReturns(varType).
    setContextToTakeAll().
    setBuiltin((callingContext: CallingContext, writer: CodeWriter) =>
    {
      forEachWordIn(varType, (additional: number) => {
        writer.storeInteger(memoryOffset + additional*kBytesPerWord);
      });
      getter.onBuiltIn((bif: BuiltInFunction) => { bif(callingContext, writer); });
    }).
    finish();
}

function forEachWordIn(varType: ObjectType, fn: (offset: number) => void) {
  const additional = varType.sizeInBytes() % kBytesPerWord === 0 ? 0 : 1;
  const sizeInWords_ = (varType.sizeInBytes() / kBytesPerWord) + additional;
  for (let i = 0; i < sizeInWords_; ++i) {
    fn(i);
  }
}

export const VariableDeclarationFunctionTable = freeze({
  make: construct  
});
