import { FunctionTypeBuild } from '../function_type_build';
import { Helpers } from '../helpers';
import { DastFunctionNameMappings, DastNode } from '../dast_build';
import { FunctionTypeBase } from './function_type_base';
import { CodeWriter } from '../code_writer';
import { WritableContextFrameStack } from './context_frame_stack';
import { FunctionDefinitionRegistry } from '../function_definition_registry';
import { DefinitionBodyFunctionBuild } from './definition_body_function_build';
import { TupleObjectFactory } from './tuple_type_factory';

const { freeze, memoize } = Helpers;

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

  const mCurrentDepth = mContextFrameStack.depth();

  const parentType = memoize(() =>
    mCurrentDepth === 0 ?
    TupleObjectFactory.emptyTuple() : 
    mContextFrameStack.topFrame().referenceType());

  const recWrappedBodyFtype = memoize(() => {
    const compositeFunctionType = defBuild.functionType();
    if (!compositeFunctionType)
      { return undefined; }

    const ftype = freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      receiver: parentType,
      simpleEmit: compositeFunctionType.simpleEmit
    });

    registerDefinitionBody(ftype, mCurrentDepth);
    return ftype;
  });

  const functionType = memoize(() => {
    if (!recWrappedBodyFtype())
      { return undefined; }
    
    return freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      simpleEmit(writer: CodeWriter) {
        writer.pushIndexOfRegistered(recWrappedBodyFtype()!);
      }
    });
  });

  return freeze({ functionType, error });
}

export const DefinitionIndexFunctionBuild = freeze({ make });
