import { CodeWriter } from '../code_writer';
import { FunctionNamingSchema } from '../function_naming_schema';
import { FunctionTypeBuild } from '../function_type_build';
import { Helpers, raise, StandardError } from '../helpers';
import { FunctionTypeBase } from './function_type_base';
import { ContextFrameSnapshot } from './context_frame_stack';
import { AstNode } from '../ast_node';

const { freeze, memoize } = Helpers;

function make
  (mNamesDefined: readonly string[] | string, 
   mArgsNode: AstNode,
   mTopFrame: ContextFrameSnapshot)
  : FunctionTypeBuild
{
  const { error, setErrorFn } = StandardError.make();

  const argsBuild = memoize(() => mTopFrame.intoBuildFor(mArgsNode));

  const argsFType = memoize(() =>
    argsBuild().functionType() ?? setErrorFn(argsBuild().error));

  const mInitialSetName = FunctionNamingSchema.
    mapToInitialSetName(mNamesDefined);

  const initialSetter = memoize(() => {
    if (!argsFType())
      { return; }

    return mTopFrame.
      referenceType().
      lookUp(mInitialSetName)?.
      byParameters(argsFType()!.returns()) ??
      raise(`Cannot find "${mInitialSetName}"`);
  });

  const getReceiver = (() => {
    if (!initialSetter())
      { return undefined; }

    return mTopFrame.
      receiverResolution().
      mapExpectedToReceiverAccessor(initialSetter()!.receiver());
  });

  const functionType = memoize(() => {
    if (!initialSetter())
      { return undefined; }

    const rec = getReceiver()!;
    return freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      simpleEmit(writer: CodeWriter) {
        initialSetter()!.emit(rec, argsFType()!, writer);
        return writer;
      }
    });
  });

  return freeze({ functionType, error });
}

/// builds the function type roughly described by "let a := stuff" statements
export const InitializerFunctionBuild = freeze({ make });
