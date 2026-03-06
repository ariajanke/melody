import { CodeWriter } from './code_writer';
import { DastNode } from './dast_build';
import { FunctionTypeBuildVisitor } from './function_type_build/function_type_build_visitor';
import { TupleObjectFactory } from './function_type_build/tuple_type';
import { FunctionTypeRegistry } from './function_type_registry';
import { Helpers, StandardErrorMessage } from './helpers';
import { StringPoolBuilder } from './string_pool';

const { freeze, memoize } = Helpers;

// export interface CodeFragment {
//   emit(writer: CodeWriter): void;
// };

export interface FunctionType {
  parameters(): ObjectType;
  returns(): ObjectType;
  emit(writer: CodeWriter): void;

  /// A name of another function on the object type, which contains this
  /// function type. Which is used as the actual receiver for this
  /// function type. If no such name is provided, then the actual receiver is
  /// the lexical receiver.
  alternateReceiver(): string | undefined;
  uid(): symbol;
};

// TODO we're so far from PTCs its not even funny
// export interface FunctionAbility {
//   evaluableNow(): boolean;
// };

export interface ObjectType {
  /// Display name only, no semantic use.
  name(): string;

  lookUp(operation: string | symbol): FunctionLookUpTable | undefined;

  /// If this is a tuple, it maybe "detuplified". By definition there are no
  /// single member tuples.
  detuplify(): Readonly<ObjectType[]> | undefined;
  uid(): symbol;

  // sizing... do I really need "stackCleanUp"?
  sizeInBytes(): number;
  sizeInStackItems(): number;
  stackCleanUp(): FunctionType;
};

export interface MutableObjectType extends ObjectType {
  setLookUp(operation: string | symbol, lookUpTable: FunctionLookUpTable): void;
};

export interface FunctionLookUpTable {
  byParameters(type: ObjectType): FunctionType | undefined;
  list(): Readonly<FunctionType[]>;
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
    make(mStringPoolBuilder,
         mFunctionRegistry);
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