import { CodeWriter } from '../code_writer';
import { FunctionLookUpTable, FunctionType, ObjectType } from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { OperatorNamingSchema } from '../operator_naming_schema';
import { WasmCompilation } from '../wasm_compilation';
import { MutableFunctionTable } from './mutable_function_table';
import { TupleObjectFactory } from './tuple_type_factory';

const { freeze, memoize } = Helpers;

export interface FunctionIndexType {
  functionIndexType(): ObjectType;
  representativeFunctionType(): FunctionType;
};

const sInsts: { [parentUid: symbol]: FunctionIndexType | undefined } = {};

function makeNew(parent: ObjectType): FunctionIndexType {
  const { emptyTuple } = TupleObjectFactory;
  const representativeFunctionType = memoize((): FunctionType => freeze({
    parameters: emptyTuple,
    returns: emptyTuple,
    receiver: () => parent,
    simpleEmit(_0: CodeWriter)
      { raise('not emittable'); },
    emit(_0: FunctionType,
          _1: FunctionType,
          _2: CodeWriter)
      { raise('not emittable'); },
    uid: memoize(Symbol)
  }));
  const lookUpTable = memoize(() =>
    MutableFunctionTable.fromFunctionType(representativeFunctionType()));
  const functionIndexType = memoize((): ObjectType => freeze({
    name: memoize(() => `${parent.name()}.Function()()`),
    lookUp(operation: string | symbol): FunctionLookUpTable | undefined {
      if (operation !== OperatorNamingSchema.kCall)
        { return undefined; }
      return lookUpTable();
    },
    detuplify: () => undefined,
    uid: memoize(Symbol),
    sizeInBytes: () => WasmCompilation.kWordSizeInBytes,
    sizeInStackItems: () => 1
  }));

  return freeze({
    functionIndexType,
    representativeFunctionType
  });
}

function make(parent: ObjectType): FunctionIndexType {
  return sInsts[parent.uid()] ??= makeNew(parent);
}

export const FunctionIndexType = freeze({ of: make });
