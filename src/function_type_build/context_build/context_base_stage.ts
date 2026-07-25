import { BuiltinFunctionNames } from '../../builtin_function_names';
import { CodeWriter } from '../../code_writer';
import { FunctionNamingSchema } from '../../function_naming_schema';
import { FunctionLookUpTable, FunctionType, ObjectType } from '../../function_type_build';
import { Helpers } from '../../helpers';
import { MemoryArray } from '../../memory_array';
import { BuiltinTypeBase } from '../integer_type';
import { ContextFrameStack } from '../context_frame_stack';
import { FunctionTypeBase } from '../function_type_base';
import { MutableFunctionTable } from '../mutable_function_table';
import { PutsFunctionLookUpTable } from './puts_function_look_up_table';
import { TupleObjectFactory } from '../tuple_type_factory';
import { ContextLinkStage_ } from './context_link_stage';

const { freeze, memoize } = Helpers;

export type FunctionOpLookUp =
  { [op: string | symbol]: FunctionLookUpTable | undefined };

export interface ContextBaseStage_ {
  referenceType(): ObjectType;
  contextLinkStage(mPendingNames: Readonly<{ [name: string]: true }>,
                   mFrameStack: ContextFrameStack)
    : ContextLinkStage_;
};

function make(): ContextBaseStage_ {
  const mTable: FunctionOpLookUp = {};
  const { emptyTuple } = TupleObjectFactory;
  const makeEmptyFtype = FunctionTypeBase.makeNewEmitlessEmpty;

  const referenceGetter = ((): FunctionType => freeze({
    ...makeEmptyFtype(),
    returns: () => referenceType(),
    simpleEmit(codeWriter: CodeWriter) {
      return codeWriter.pushStackPointer();
    }
  }));

  const noneGetter = ((): FunctionType => freeze({
    ...makeEmptyFtype(),
    simpleEmit(_0: CodeWriter) {}
  }));

  const addPuts = ((): FunctionLookUpTable =>
    mTable[BuiltinFunctionNames.kPuts] = PutsFunctionLookUpTable.instance());

  const addContext = ((): MutableFunctionTable =>
    mTable[FunctionNamingSchema.kContextName] = MutableFunctionTable.
      make().setDefinition(emptyTuple(), referenceGetter()));

  // TODO might be unused
  const addNone = ((): MutableFunctionTable =>
    mTable[FunctionNamingSchema.kNoneName] = MutableFunctionTable.
      make().setDefinition(emptyTuple(), noneGetter()));

  const referenceType = memoize((): ObjectType => {
    const inst = freeze({
      ...BuiltinTypeBase.defaultsWith(),
      name: () => 'ContextType',
      lookUp(operation: string | symbol): FunctionLookUpTable | undefined
        { return mTable[operation]; },
      // NOTE: Just a pointer for the reference type.
      sizeInBytes: () => MemoryArray.kWordSizeInBytes,
      sizeInStackItems: () => 1
    });
    return addPuts() && addContext() && addNone() && inst;
  });

  function contextLinkStage
    (mPendingNames: Readonly<{ [name: string]: true }>,
     mFrameStack: ContextFrameStack)
  {
    return ContextLinkStage_.
      make( mPendingNames, mFrameStack, referenceType(), mTable );
  }

  return freeze({
    referenceType,
    contextLinkStage
  });
}

/// A ContextBaseCreation is the first, prototype stage for creating a stack
/// frame's reference type.
export const ContextBaseStage_ = freeze({ make });
