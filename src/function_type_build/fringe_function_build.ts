import { CodeWriter } from '../code_writer';
import { FunctionNamingSchema } from '../function_naming_schema';
import { FunctionTypeBuild } from '../function_type_build';
import { Helpers, StandardError } from '../helpers';
import { ContextFrameSnapshot } from './context_frame_stack';
import { FunctionTypeBase } from './function_type_base';
import { TupleObjectType } from './tuple_object_type';

const { freeze, memoize } = Helpers;

export const FringeFunctionBuild = freeze({
  make(mName: string, mTopSnapshot: ContextFrameSnapshot): FunctionTypeBuild {
    const { error, setErrorMessage } = StandardError.make();
    const { emptyTuple } = TupleObjectType;
    const { makeNewEmitlessEmpty, emitEmptyTuple } = FunctionTypeBase;

    const functionName =
      mName === FunctionNamingSchema.kContextName ?
      mName :
      FunctionNamingSchema.mapToFringeAccessor(mName);

    const originalFtype = memoize(() => mTopSnapshot.
      referenceType().
      lookUp(functionName)?.
      byParameters(emptyTuple()) ??
      setErrorMessage(`Cannot find function for "${mName}"`));

    const receiverFunctionType = memoize(() => {
      if (!originalFtype())
        { return undefined; }

      const { receiver } = originalFtype()!;

      return mTopSnapshot.
        receiverResolution().
        mapExpectedToReceiverAccessor(receiver()) ??
        setErrorMessage(`Cannot find receiver '${receiver().name()}'`);
    });

    const functionType = memoize(() => {
      const originalHasNoReceiver =
        originalFtype()?.receiver().uid() === emptyTuple().uid();
      if (!originalFtype() || originalHasNoReceiver)
        { return originalFtype(); }

      return freeze({
        ...makeNewEmitlessEmpty(),
        returns: originalFtype()!.returns,
        simpleEmit(writer: CodeWriter) {
          originalFtype()!.
            emit(receiverFunctionType()!, emitEmptyTuple(), writer);
        }
      });
    });

    return freeze({ functionType, error });
  }
});
