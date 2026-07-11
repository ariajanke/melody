import { CodeWriter } from './code_writer';
import { DastNode } from './dast_build';
import { FunctionTypeBase } from './function_type_build/function_type_base';
import { FunctionTypeBuildVisitor } from './function_type_build/function_type_build_visitor';
import { TupleObjectFactory } from './function_type_build/tuple_type';
import { FunctionTypeRegistry } from './function_type_registry';
import { Helpers, StandardErrorMessage } from './helpers';
import { StringPoolBuilder } from './string_pool';

const { freeze, memoize } = Helpers;

export interface FunctionType {
  parameters(): ObjectType;
  returns(): ObjectType;



  simpleEmit(writer: CodeWriter): void;

  emit(receiverFtype: FunctionType,
       parameterFtype: FunctionType,
       writer: CodeWriter): void;

  // proposal:
  // A function type which whose receiver and/or parameters is not "Tuple()"
  // is not considered evaluable.

  /// A name of another function on the parent object type. Which is used as
  /// the actual receiver for this
  /// function type. If no such name is provided, then the actual receiver is
  /// the DAST indicated receiver.
  // alternateReceiver(): string | undefined;
  // a consequence of this definition: accessors/modifiers may do emit receiver
  // things on their own.
  // e.g. an explicit "$<context> . $a:= ( 5 )" results in a DAST call node, with an
  // explicit <context> "lexical" receiver
  //
  // Does this overwrite the "lexical" receiver? As it's currectly written, yes
  // But should it? To answer this, lets think about tables, and try to keep things clean there
  // a.b.c := 5
  // The receiver here is "a.b" and ".c:=" is the function name
  // a.b.foo()
  // what if we had "handled receiver" or something to that effect here?
  // what if we had a "base receiver" which covers what this function expects
  // as being the mounted receiver?
  // yuck, this sort of introduces another safety stack by which we have to
  // keep track of receivers ...
  // maybe it doesn't have to be that complicated, fundamentally there is only
  // ever one receiver, consider "a.b", this expersion has to evaluate whereby
  // that "b" is mounted and ready to play the role of receiving either "foo" or
  // ".c:="

  receiver(): ObjectType;
  // for "none" (e.g. "puts"), this can be "Tuple()"
  // for "<context>", this can be "ContextType"
  // for "5" (e.g. "5 + 6"), this will be "Integer"
  // expectedReceiver != parent type (all the time anyhow, but can be)

  uid(): symbol;
};

// TODO we're so far from PTCs its not even funny
// export interface FunctionAbility {
//   evaluableNow(): boolean;
// };

export interface ObjectType {
  /// Display name only, no semantic use.
  name(): string;

  // I need object type to be able to say "that's defined, but..."
  lookUp(operation: string | symbol): FunctionLookUpTable | undefined;

  /// If this is a tuple, it maybe "detuplified". By definition there are no
  /// single member tuples.
  detuplify(): Readonly<ObjectType[]> | undefined;
  uid(): symbol;

  // sizing... do I really need "stackCleanUp"?
  sizeInBytes(): number;
  sizeInStackItems(): number;
  // TODO got to remove this, it's semantically unnecessary
  // stackCleanUp(): FunctionType;
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
  emptyTupleType: TupleObjectFactory.emptyTuple,
  makeBaseType: FunctionTypeBase.receivedByContext
});