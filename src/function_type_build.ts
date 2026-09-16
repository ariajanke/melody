import { CodeWriter } from './code_writer';
import { DastNode } from './dast_build';
import { FunctionDefinitionRegistry } from './function_definition_registry';
import { FunctionTypeBase } from './function_type_build/function_type_base';
import { FunctionTypeBuildVisitor } from './function_type_build/function_type_build_visitor';
import { TupleObjectType } from './function_type_build/tuple_object_type';
import { Helpers, StandardErrorMessage } from './helpers';

const { freeze, memoize } = Helpers;

interface FunctionAbilities {
  emittable?: FunctionEmission;
  evaluable?: FunctionEvaluation;
  typeable?: FunctionType;
};

interface FunctionEmissionContext {
  replaceReceiver(ftype: FunctionType): void;
  replaceParameters(ftype: FunctionType): void;

  receiver(): FunctionType;
  parameters(): FunctionType;
};

interface TypeRepresentationInstance {};
interface DataBlob {
  dataAsIntegers(): Readonly<number[]>;
};

// I want to hide the fact of this either depending on a
// WASM runtime or a *Script runtime.
interface FunctionEvaluation {
  // Melody can internally process what...?
  // At least: integers, type representations (for type meta functions)
  // difference signatures?
  // How do I mount arguments?
  // otype_instance.mount?
  // what does a generic instance look like interface-wise?
  asTypeRepresentation(): TypeRepresentationInstance | undefined;
  asGenericBlob(): DataBlob | undefined;
};

interface FunctionEmission {
  emit(context: FunctionEmissionContext, writer: CodeWriter): void;
};

export interface FunctionType {
  parameters(): ObjectType;
  returns(): ObjectType;
  /// A name of another function on the parent object type. Which is used as
  /// the actual receiver for this
  /// function type. If no such name is provided, then the actual receiver is
  /// the DAST indicated receiver.
  receiver(): ObjectType;

  simpleEmit(writer: CodeWriter): void;

  emit(receiverFtype: FunctionType,
       parameterFtype: FunctionType,
       writer: CodeWriter): void;

  // abilities(): FunctionAbilities;

  uid(): symbol;
};

export const FunctionType = FunctionTypeBase;

export interface ObjectType {
  /// Display name only, no semantic use.
  name(): string;

  lookUp(operation: string | symbol): FunctionLookUpTable | undefined;

  /// If this is a tuple, it maybe "detuplified". By definition there are no
  /// single member tuples.
  detuplify(): Readonly<ObjectType[]> | undefined;
  uid(): symbol;

  sizeInBytes(): number;
  sizeInStackItems(): number;
};

export interface MutableObjectType extends ObjectType {
  setLookUp(operation: string | symbol, lookUpTable: FunctionLookUpTable): void;
};

export interface FunctionLookUpTable {
  byParameters(type: ObjectType): FunctionType | undefined;
  uniqueFunctionType(): FunctionType | undefined;
};

export interface FunctionTypeBuild {
  functionType(): FunctionType | undefined,
  error(): StandardErrorMessage
};

function make(mRoot: DastNode,
              mFunctionRegistry?: FunctionDefinitionRegistry)
  : FunctionTypeBuild
{
  mFunctionRegistry ??= FunctionDefinitionRegistry.make();
  const mVisitor = FunctionTypeBuildVisitor.make(mFunctionRegistry);
  const mBuild = memoize(() => mRoot.visit(mVisitor));

  return freeze({
    functionType: () => mBuild().functionType(),
    error: () => mBuild().error()
  });
}

export const FunctionTypeBuild = freeze({
  make,
  emptyTupleType: TupleObjectType.emptyTuple
});
