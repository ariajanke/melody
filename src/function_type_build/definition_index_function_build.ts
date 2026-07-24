import { FunctionTypeBuild } from '../function_type_build';
import { Helpers } from '../helpers';
import { DastFunctionNameMappings, DastNode } from '../dast_build';
import { FunctionTypeBase } from './function_type_base';
import { CodeWriter } from '../code_writer';
import { WritableContextFrameStack } from './context_frame_stack';
import { FunctionDefinitionRegistry } from '../function_definition_registry';
import { DefinitionBodyFunctionBuild } from './definition_body_function_build';

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

  const bodyFtype = memoize(() => {
    const compositeFunctionType = defBuild.functionType();
    if (!compositeFunctionType)
      { return undefined; }

    registerDefinitionBody(compositeFunctionType, mCurrentDepth);
    return compositeFunctionType;
  });

  const functionType = memoize(() => {
    if (!bodyFtype())
      { return undefined; }
    
    return freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      simpleEmit(writer: CodeWriter) {
        writer.pushIndexOfRegistered(bodyFtype()!);
      }
    });
  });

  return freeze({ functionType, error });
}

export const DefinitionIndexFunctionBuild = freeze({ make });
