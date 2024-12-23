import { BuiltInFunction, CallHandlingStrategies, CallingContext, CodeWriter, FunctionType, IncompleteFunctionType } from './function_type';
import { Helpers } from './helpers';
import { ObjectType } from './object_type';

const { freeze, memoize } = Helpers;

function construct(mMadeIntoType?: FunctionType) {
  const mBuiltins: BuiltInFunction[] = [];
  const mContextCallingStrategy:
    (cc: CallingContext) => CallingContext =
    mMadeIntoType?.callingContextForParameters ??
    CallingContext.toInherit;
  const inst = freeze({
    pushBuiltin(fn: BuiltInFunction): FunctionCompositor {
      mBuiltins.push(fn);
      return inst;
    },
    finish: memoize((): FunctionType =>
      IncompleteFunctionType.
        make().
        setCallStrategy(CallHandlingStrategies.noReceiver).
        setBuiltin((callingContext: CallingContext, writer: CodeWriter) => {
          const constituateContext = mContextCallingStrategy(callingContext);
          mBuiltins.forEach((fn: BuiltInFunction) => fn(constituateContext, writer));
          mMadeIntoType?.onBuiltIn((bif: BuiltInFunction) => {
            bif(callingContext, writer);
          });
        }).
        setParameters(ObjectType.emptyTupleInstance()).
        setReturns(mMadeIntoType?.returns() ?? ObjectType.emptyTupleInstance()).
        finish())
  });
  return inst;
}

export interface FunctionCompositor {
  pushBuiltin: (fn: BuiltInFunction) => FunctionCompositor,
  finish(): FunctionType
};

export const FunctionCompositor = freeze({ make: construct });
