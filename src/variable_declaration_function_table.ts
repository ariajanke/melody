import { type FunctionLookUpTable } from './function_look_up_table';
import {
  BuiltInFunction,
  CallHandlingStrategies,
  CallingContext,
  IncompleteFunctionType,
  type FunctionType,
} from './function_type';
import { Helpers } from './helpers';
import { ObjectType } from './object_type';
import { type CodeWriter } from './code_writer';

const { freeze } = Helpers;

export interface VariableDeclarationFunctionTable extends FunctionLookUpTable {
  offset(): number
};

export const VariableDeclarationFunctionTable = freeze({
  make(varType: ObjectType, operator: string, memoryOffset: number) {
    const { noReceiver } = CallHandlingStrategies;
    const { uid } = varType;
    const mGetter = IncompleteFunctionType.
      make().
      setCallStrategy(noReceiver).
      setParameters(ObjectType.emptyTupleInstance()).
      setReturns(varType).
      setBuiltin((callingContext: CallingContext, writer: CodeWriter) =>
      {
        if (!callingContext.canTake(varType)) {
          return;
        }
        writer.loadInteger(memoryOffset);
      }).
      finish();
    // still need setter (once though) for the "=" case
    // does the actual store
    const mSetter = (() => {
      if (operator !== ':=')
        { return undefined; }
      return IncompleteFunctionType.
        make().
        setCallStrategy(noReceiver).
        setParameters(varType).
        setReturns(varType).
        setContextToTakeAll().
        setBuiltin((callingContext: CallingContext, writer: CodeWriter) =>
        {
          writer.storeInteger(memoryOffset);
          mGetter.onBuiltIn((bif: BuiltInFunction) => { bif(callingContext, writer); });
        }).
        finish();
      })();
    return freeze({
      offset: () => memoryOffset,
      byParameters(param: ObjectType): FunctionType | undefined {
        const params = param.decompose();
        if (params.length === 0) {
          return mGetter;
        } else if (params[0].uid() === uid()) {
          return mSetter;
        }
        return undefined;
      },
      variableType: varType
    }) satisfies VariableDeclarationFunctionTable;
  }
});
