import { type FunctionLookUpTable } from './function_look_up_table';
import {
  CallingContext,
  IncompleteFunctionType,
  type FunctionType,
} from './function_type';
import { Helpers } from './helpers';
import { ObjectType } from './object_type';
import { type CodeWriter } from './code_writer';
import { VastNode } from './vast_node';

const { freeze, memoize } = Helpers;

export interface VariableDeclarationFunctionTable extends FunctionLookUpTable {
  offset(): number,
};

const kBytesPerWord = 4;

function construct
  (mVarType: ObjectType,
   mOperator: string,
   mValueNode: VastNode,
   mMemoryOffset: number)
{
  const mGetter = (() => {
    if (mOperator === '=' && mValueNode.itCanBe().evaluatedNow()) {
      return mValueNode.functionType();
    } else {
      return makeMemoryGetter(mVarType, mMemoryOffset).finish();
    }
  });
  const makeSetter_ = memoize(() =>
    makeSetter(mGetter(), mVarType, mMemoryOffset).finish());
  // misnomer: it's BOTH getter and setter
  const mSetter = (() => {
    if (mOperator === '=')
      { return undefined; }
    return makeSetter_();
  });
  const oneTimeSetter = (() => {
    if (mOperator === '=' && mValueNode.itCanBe().evaluatedNow()) {
      return mGetter;
    }
    return makeSetter_;
  })();
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
    variableType: mVarType,
    oneTimeSetter: memoize(oneTimeSetter)
  }) satisfies VariableDeclarationFunctionTable;
}

function makeMemoryGetter(varType: ObjectType, memoryOffset: number) {
  return IncompleteFunctionType.
    make().
    setParameters(ObjectType.emptyTupleInstance()).
    setReturns(varType).
    setBuiltin((callingContext: CallingContext, writer: CodeWriter) =>
    {
      if (!callingContext.canTake(varType)) {
        return;
      }
      forEachWord(inReverseOrder, varType, (additional: number) => {
        writer.loadInteger(memoryOffset + additional*kBytesPerWord);
      });
    });
}

function makeSetter(getter: FunctionType, varType: ObjectType, memoryOffset: number) {
  return IncompleteFunctionType.
    make().
    setParameters(varType).
    setReturns(varType).
    setContextToTakeAll().
    setBuiltin((callingContext: CallingContext, writer: CodeWriter) =>
    {
      forEachWord(inPlainOrder, varType, (additional: number) => {
        writer.storeInteger(memoryOffset + additional*kBytesPerWord);
      });
      getter.builtIn()(callingContext, writer);
    });
}

function inPlainOrder(limit: number, fn: (idx: number) => void) {
  for (let i = 0; i < limit; ++i) {
    fn(i);
  }
}

function inReverseOrder(limit: number, fn: (idx: number) => void) {
  for (let i = limit - 1; i >= 0; --i) {
    fn(i);
  }
}

function forEachWord
  (ordering: (limit: number, fn: (idx: number) => void) => void,
   varType: ObjectType,
   fn: (offset: number) => void)
{
  const additional = varType.sizeInBytes() % kBytesPerWord === 0 ? 0 : 1;
  const sizeInWords_ = (varType.sizeInBytes() / kBytesPerWord) + additional;
  ordering(sizeInWords_, fn);
}

export const VariableDeclarationFunctionTable = freeze({
  make: construct
});
