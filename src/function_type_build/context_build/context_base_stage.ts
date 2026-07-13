import { BuiltinFunctionNames } from '../../builtin_function_names';
import { CodeWriter } from '../../code_writer';
import { FunctionNamingSchema } from '../../function_naming_schema';
import { FunctionLookUpTable, FunctionType, ObjectType } from '../../function_type_build';
import { Helpers } from '../../helpers';
import { MemoryArray } from '../../memory_array';
import { BuiltinTypeBase } from '../builtin_type';
import { ContextBaseStage } from '../context_build';
import { ContextFrameStack } from '../context_frame_stack';
import { FunctionTypeBase } from '../function_type_base';
import { MutableFunctionTable } from '../mutable_function_table';
import { PutsFunctionLookUpTable } from '../puts_function_look_up_table';
import { TupleObjectFactory } from '../tuple_type';
import { UsedAncestorCollection } from './used_ancestor_collection';

const { freeze, memoize } = Helpers;

export type FunctionOpLookUp =
  { [op: string | symbol]: FunctionLookUpTable | undefined };

/// A ContextBaseCreation is the first, prototype stage for creating a stack
/// frame's reference type.
export const ContextBaseStage_ = freeze({
  make(): ContextBaseStage {
    // scope: this replaces "stage" specifically
    // add puts
    const mTable: FunctionOpLookUp = {};
    const { emptyTuple } = TupleObjectFactory;
    const addPuts = ((): FunctionLookUpTable =>
      mTable[BuiltinFunctionNames.kPuts] = PutsFunctionLookUpTable.instance());

    const addContext = ((): MutableFunctionTable =>
      mTable[FunctionNamingSchema.kContextName] = MutableFunctionTable.
        make().setDefinition(emptyTuple(), referenceGetter()));

    const addNone = ((): MutableFunctionTable =>
      mTable[FunctionNamingSchema.kNoneName] = MutableFunctionTable.
        make().setDefinition(emptyTuple(), noneGetter()));

    const referenceGetter = memoize((): FunctionType => freeze({
      ...FunctionTypeBase.makeDefaults(),
      returns: () => referenceType(),
      simpleEmit(codeWriter: CodeWriter) {
        return codeWriter.pushStackPointer();
      }
    }));

    const noneGetter = memoize((): FunctionType => freeze({
      ...FunctionTypeBase.makeDefaults(),
      simpleEmit(_0: CodeWriter) {}
    }));

    const referenceType = memoize((): ObjectType => {
      const inst = freeze({
        ...BuiltinTypeBase.defaultsWith((): ObjectType => inst),
        name: () => 'ContextType',
        lookUp(operation: string | symbol): FunctionLookUpTable | undefined
          { return mTable[operation]; },
        // NOTE: Just a pointer for the reference type.
        sizeInBytes: () => MemoryArray.kWordSizeInBytes,
        sizeInStackItems: () => 1
      });
      return addPuts() && addContext() && addNone() && inst;
    });

    return freeze({
      referenceType,
      contextLinkBuild: ((mUsedAncestorCollection: UsedAncestorCollection,
        mFrameStack: ContextFrameStack
      ) =>
        ContextLinkBuild.make( mUsedAncestorCollection, mFrameStack, referenceType(), mTable,  ))
      // some method about constructing the next phase...
    })
  }
});
