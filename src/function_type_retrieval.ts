import { AstFunctionCallNode } from './ast_function_call_node';
import { AstIdentifierNode } from './ast_identifier_node';
import { AstNode } from './ast_node';
import { AstTupleNode } from './ast_tuple_node';
import { ExecutionContext } from './execution_context';
import { FunctionLookUpTable } from './function_look_up_table';
import { Helpers, StandardError } from './helpers';

const { freeze } = Helpers;

function construct() {
  let mCall: AstFunctionCallNode | undefined;
  let mReceiver: AstNode | undefined; 
  let mParams: AstTupleNode | undefined;
  let mContext: ExecutionContext | undefined;

  const { error, setErrorFn, setErrorMessage } = StandardError.make();

  function verifyMembersPresent() {
    mCall || mReceiver || mParams || mContext || (() => {
      throw new Error('Must call reset with all three parameters');
    })();
  }

  function getReceiverType() {
    const tr = (mContext as ExecutionContext).executionTypeOf(mReceiver as AstNode);
    return tr.resolve() ?? setErrorFn(tr.error);
  }

  function getParametersType() {
    const tr = (mContext as ExecutionContext).executionTypeOf(mParams as AstTupleNode);
    return tr.resolve() ?? setErrorFn(tr.error);
  }

  function specialFunctionType(): FunctionLookUpTable | undefined {
    const call = mCall as AstFunctionCallNode;
    if (call.name === ':=' && AstIdentifierNode.hasCreated(mReceiver as AstNode)) {
      const receiverAsIdentifier = mReceiver as AstIdentifierNode;
      const context = mContext as ExecutionContext;
      return context.
        lookUpOnContextType(receiverAsIdentifier.contextMethodName()) ??
        context.lookUpOnContextType(receiverAsIdentifier.asString());
    }
    return undefined;
  }

  const inst = freeze({
    reset(call: AstFunctionCallNode, receiver: AstNode, params: AstTupleNode,
          context: ExecutionContext)
    {
      mCall = call;
      mReceiver = receiver;
      mParams = params;
      mContext = context;
      return inst;
    },
    retrievedType() {
      verifyMembersPresent();
      const receiverType = getReceiverType();
      if (!receiverType) return undefined;
      const paramsType = getParametersType();
      if (!paramsType) return undefined;
      const fTable =
        specialFunctionType() ??
        receiverType.lookUp((mCall as AstFunctionCallNode).name);
      if (!fTable) {
        return setErrorMessage(`No function "${ (mCall as AstFunctionCallNode).name }"`);
      }
      const { resolve, error } = (mCall as AstFunctionCallNode).functionTypeBy(fTable, paramsType);
      return resolve() ?? setErrorFn(error);
    },
    error
  });
  return inst;
}

export const FunctionTypeRetrieval = freeze({ make: construct });
export type FunctionTypeRetrieval = ReturnType<typeof construct>;
