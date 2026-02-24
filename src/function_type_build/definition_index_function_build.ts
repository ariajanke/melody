import { FunctionLookUpTable, FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { DastFunctionNameMappings, DastNode } from '../dast_build';
import { FunctionTypeBase } from './function_type_base';
import { CodeWriter } from '../code_writer';
import { WritableContextFrameStack } from './context_frame_stack';
import { FunctionDefinitionRegistry } from '../function_definition_registry';
import { DefinitionBodyFunctionBuild } from './definition_body_function_build';
import { TupleObjectFactory } from './tuple_type_factory';
import { MemoryArray } from '../memory_array';
import { FunctionNamingSchema } from '../function_naming_schema';
import { MutableFunctionTable } from './mutable_function_table';

const { freeze, memoize } = Helpers;

const functionHandleBaseType = memoize((): ObjectType => freeze({
  name: () => 'Function()()',
  lookUp(_0: string | symbol): FunctionLookUpTable | undefined
    { return undefined; },
  detuplify: () => undefined,
  uid: memoize(Symbol),
  sizeInBytes: () => MemoryArray.kWordSizeInBytes,
  sizeInStackItems: () => 1
}));

function make
  (mDefs: DastFunctionNameMappings,
   mNodes: Readonly<DastNode[]>,
   mFunctionRegistry: FunctionDefinitionRegistry,
   mContextFrameStack: WritableContextFrameStack)
  : FunctionTypeBuild
{
  const defBuild = DefinitionBodyFunctionBuild.
    make(mDefs, mNodes, mContextFrameStack);

  const { error } = defBuild;
  const { registerDefinitionBody } = mFunctionRegistry;
  const { emptyTuple } = TupleObjectFactory;

  const mCurrentDepth = mContextFrameStack.depth();

  const parentType = memoize(() =>
    mCurrentDepth === 0 ?
    emptyTuple() : 
    mContextFrameStack.topFrame().referenceType());

  const recWrappedBodyFtype = memoize(() => {
    const compositeFunctionType = defBuild.functionType();
    if (!compositeFunctionType)
      { return undefined; }

    // evaluation deference is this thing's greatest strength and weakness
    parentType();
    const ftype = freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      receiver: parentType,
      simpleEmit: compositeFunctionType.simpleEmit
    });

    registerDefinitionBody(ftype, mCurrentDepth);
    return ftype;
  });

  const functionHandleType = memoize(() => {
    const ftype = recWrappedBodyFtype() ?? raise('should not be callable on error');
    const callFTable = memoize(() => MutableFunctionTable.
      fromFunctionType(ftype));

    return freeze({
      ...functionHandleBaseType(),
      lookUp(operation: string | symbol) {
        if (operation !== FunctionNamingSchema.kCallName)
          { return undefined; }
        return callFTable();
      },
    });
  });

  const functionType = memoize((): FunctionType | undefined => {
    if (!recWrappedBodyFtype())
      { return undefined; }
    
    return freeze({
      emit(_0: FunctionType,
       _1: FunctionType,
       _2: CodeWriter): void
      {
        raise('uh oh');
      },
      uid: memoize(Symbol),
      // this is essentially a literal...
      receiver: emptyTuple,
      parameters: emptyTuple,
      returns: functionHandleType,
      simpleEmit(writer: CodeWriter) {
        writer.pushIndexOfRegistered(recWrappedBodyFtype()!);
      }
    });
  });

  return freeze({ functionType, error });
}

export const DefinitionIndexFunctionBuild = freeze({ make });
