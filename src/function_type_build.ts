import { CodeWriter } from './code_writer';
import { DastNode } from './dast_build';
import { FunctionTypeBuildVisitor } from './function_type_build/function_type_build_visitor';
import { TupleObjectFactory } from './function_type_build/tuple_type';
import { FunctionTypeRegistry } from './function_type_registry';
import { Helpers, StandardErrorMessage } from './helpers';
import { StringPoolBuilder } from './string_pool';

const { freeze, memoize } = Helpers;

export interface CodeFragment {
  emit(writer: CodeWriter): void;
};

export interface FunctionType {
  parameters(): ObjectType;
  returns(): ObjectType;
  // this is why I wanted an "emitter"...
  // sometimes I can't know what the code will look like
  emit(writer: CodeWriter): CodeWriter | undefined;
  // not emit... but "value"? as in evulating it now
  uid(): symbol;
};

export interface FunctionAbility {
  evaluableNow(): boolean;
};

export interface ObjectType {
  name(): string;
  lookUp(operation: string | symbol): FunctionLookUpTable | undefined;
  detuplify(): Readonly<ObjectType[]> | undefined;
  uid(): symbol;
  sizeInBytes(): number;
  sizeInStackItems(): number;
  stackCleanUp(): FunctionType;
};

export interface MutableObjectType extends ObjectType {
  setLookUp(operation: string | symbol, lookUpTable: FunctionLookUpTable): void;
};

export interface FunctionLookUpTable {
  byParameters(type: ObjectType): FunctionType | undefined;
};

export interface FunctionTypeBuild {
  functionType(): FunctionType | undefined,
  error(): StandardErrorMessage
};

function make(mRoot: DastNode,
              mStringPoolBuilder: StringPoolBuilder,
              mFunctionRegistry: FunctionTypeRegistry)
  : FunctionTypeBuild
{
  const mVisitor = FunctionTypeBuildVisitor.
    make(mStringPoolBuilder, mFunctionRegistry);
  const mBuild = memoize(() => mRoot.visit(mVisitor));

  return freeze({
    functionType: () => mBuild().functionType(),
    error: () => mBuild().error()
  });
}

export const FunctionTypeBuild = freeze({
  make,
  emptyTupleType: TupleObjectFactory.emptyTuple
});