import { BuiltinFunctionNames } from '../../builtin_function_names';
import { CodeWriter } from '../../code_writer';
import { FunctionNamingSchema } from '../../function_naming_schema';
import { FunctionLookUpTable, FunctionType, ObjectType } from '../../function_type_build';
import { Helpers } from '../../helpers';
import { MemoryArray } from '../../memory_array';
import { ContextFrameStack } from '../context_frame_stack';
import { FunctionTypeBase } from '../function_type_base';
import { MutableFunctionTable } from '../mutable_function_table';
import { PutsFunctionLookUpTable } from './puts_function_look_up_table';
import { ContextLinkStage_ } from './context_link_stage';
import { BuiltinTypeBase } from '../builtin_type_base';
import { FunctionOpLookUp, WritableObjectType } from './writable_object_type';

const { freeze, memoize } = Helpers;

export interface ContextBaseStage_ {
  referenceType(): ObjectType;
  contextLinkStage(mPendingNames: Readonly<{ [name: string]: true }>,
                   mFrameStack: ContextFrameStack)
    : ContextLinkStage_;
};

function make(mFrameName: string = 'ContextType'): ContextBaseStage_ {
  const mTable: FunctionOpLookUp = {};
  const makeEmptyFtype = FunctionTypeBase.makeNewEmitlessEmpty;

  const referenceGetter = ((): FunctionType => freeze({
    ...makeEmptyFtype(),
    returns: (): ObjectType => writableReferenceType(),
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

  const addContext = ((): FunctionLookUpTable =>
    mTable[FunctionNamingSchema.kContextName] = MutableFunctionTable.
      fromFunctionType(referenceGetter()));

  // TODO might be unused
  const addNone = ((): FunctionLookUpTable =>
    mTable[FunctionNamingSchema.kNoneName] = MutableFunctionTable.
      fromFunctionType(noneGetter()));

  const writableReferenceType = memoize((): WritableObjectType =>
    addPuts() &&
    addContext() &&
    addNone() &&
    WritableObjectType.make(mTable, freeze({
      ...BuiltinTypeBase.makeNewWithDefaults(),
      name: () => mFrameName,
      // NOTE: Just a pointer for the reference type.
      sizeInBytes: () => MemoryArray.kWordSizeInBytes,
      sizeInStackItems: () => 1
    })));

  const referenceType = writableReferenceType as () => ObjectType;

  function contextLinkStage
    (mPendingNames: Readonly<{ [name: string]: true }>,
     mFrameStack: ContextFrameStack)
  {
    return ContextLinkStage_.
      make( mPendingNames, mFrameStack, writableReferenceType() );
  }

  return freeze({
    referenceType,
    contextLinkStage
  });
}

/// A ContextBaseCreation is the first, prototype stage for creating a stack
/// frame's reference type.
export const ContextBaseStage_ = freeze({ make });
