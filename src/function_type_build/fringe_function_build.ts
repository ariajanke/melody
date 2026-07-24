import { CodeWriter } from '../code_writer';
import { FunctionNamingSchema } from '../function_naming_schema';
import { FunctionTypeBuild } from '../function_type_build';
import { Helpers, StandardError } from '../helpers';
import { ContextFrameSnapshot } from './context_frame_stack';
import { FunctionTypeBase } from './function_type_base';
import { TupleObjectFactory } from './tuple_type_factory';

const { freeze, memoize } = Helpers;

export const FringeFunctionBuild = freeze({
  make(mName: string, mTopSnapshot: ContextFrameSnapshot): FunctionTypeBuild {
    const { error, setErrorMessage } = StandardError.make();
    const { emptyTuple } = TupleObjectFactory;
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

    const functionType = memoize(() => {
      if (!originalFtype() ||
          originalFtype()!.receiver().uid() === emptyTuple().uid())
        { return originalFtype(); }

      const { receiver } = originalFtype()!;

      const recEmit = mTopSnapshot.
        receiverResolution().
        mapExpectedToReceiverAccessor(receiver());
      if (!recEmit) {
        return setErrorMessage(`Cannot find receiver '${receiver().name()}'`);
      }
      const simpleEmit = (writer: CodeWriter) => {
        originalFtype()!.
          emit(recEmit, emitEmptyTuple(), writer);
      };
      
      return freeze({
        ...makeNewEmitlessEmpty(),
        returns: originalFtype()!.returns,
        simpleEmit
      });
    });

    return freeze({ functionType, error });
  }
});
