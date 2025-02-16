import { AstFunctionCallNode } from '../ast_function_call_node';
import { AstNode } from '../ast_node';
import { Helpers, StandardError } from '../../helpers';
import { type ObjectLookUpTable } from '../../object_look_up_table';
import { LetExpressionSubscriber } from './let_expression_publisher';
import { ContextType } from '../../context_type';
import { FunctionType } from '../../function_type';
import { VastNode } from '../../vast_node';
import { AstTupleNode } from '../ast_tuple_node';

const { freeze, memoize } = Helpers;

export type FunctionTypeRetrievalResult = Readonly<{
  functionType: FunctionType,
  pushParameters: boolean
  pushReceiver: boolean
}>;

function hasToPushReceiver(name: string) {
  return name === '-' || name === '+' || name === '*';
}

function construct
  (mCall: AstFunctionCallNode,
   mReceiver: AstNode,
   mParamsAsAst: AstTupleNode,
   mLookUpTable: ObjectLookUpTable,
   mLetSubscriber: LetExpressionSubscriber,
   mParamsAsVast: VastNode)
{
  // mCall.name maybe '=', ':=', 'call', '+', '-'... and so on
  const { isInsideLet } = mLetSubscriber;
  const { error, setErrorFn, setErrorMessage } = StandardError.make();
  const isProcessTimeConstant =
    mCall.alwaysAsName() === '=' && mParamsAsVast.itCanBe().evaluatedNow();
  const paramsType = mParamsAsVast.functionType().returns;
  const contextType = memoize(() => {
    const contextTypeRes = mLookUpTable.lookUpByName(ContextType.typeName());
    const contextType = contextTypeRes.resolve();
    if (!contextType)
      { return setErrorFn(contextTypeRes.error); }
    return contextType;
  });
  function lookUpSetter(byName: string | undefined): FunctionTypeRetrievalResult | undefined {
    const contextType_ = contextType();
    if (!contextType_)
      { return undefined; }
    if (!byName) {
      // perhaps try to look up an explicit ":=" function?
      return setErrorMessage(`Unnamed assignments not supported (yet) for "${mReceiver.asString()}"`);
    }
    const functionType = contextType_.
      lookUp(byName)?.
      byParameters(paramsType()) ??
      setErrorMessage(`Cannot find setter for "${byName}"`);
    if (functionType) {
      return freeze({
        functionType,
        pushParameters: true,
        pushReceiver: false
      });
    }
    return undefined;
  }
  return freeze({
    build(): FunctionTypeRetrievalResult | undefined {
      if (isProcessTimeConstant) {
        return freeze({
          functionType: mParamsAsVast.functionType(),
          pushParameters: false,
          pushReceiver: false
        });
      }
      const callName = mCall.alwaysAsName();
      if ((callName === '=' || callName === ':=') && isInsideLet()) {
        return lookUpSetter(`=${mReceiver.asName()}`);
      }
      if (callName === ':=') {
        return lookUpSetter(`.${mReceiver.asName()}`);
      }
      const receiverTypeRes = mReceiver.executionType(mLookUpTable);
      const receiverType = receiverTypeRes.resolve();
      if (!receiverType)
        { return setErrorFn(receiverTypeRes.error); }

      const functionType = receiverType.
        lookUp(callName)?.
        byParameters( paramsType() ) ??
        setErrorMessage(`Cannot find function "${callName}"`);
      if (functionType) {
        return freeze({
          functionType,
          pushParameters: true,
          pushReceiver: hasToPushReceiver(callName)
        });
      }
      return undefined;
    },
    error
  });
}

export const FunctionTypeRetrieval = freeze({ make: construct });
export type FunctionTypeRetrieval = ReturnType<typeof construct>;
