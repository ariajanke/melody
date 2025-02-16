import { Helpers, StandardErrorMessage } from '../../helpers';
import { ObjectLookUpTable } from '../../object_look_up_table';
import { VastFunctionCallNode } from '../../vast_function_call_node';
import { VastNode } from '../../vast_node';
import { VastTupleNode } from '../../vast_tuple_node';
import { AstFunctionCallNode } from '../ast_function_call_node';
import { AstNode } from '../ast_node';
import { AstNodeVisitor } from '../ast_node_visitor';
import { AstTupleNode } from '../ast_tuple_node';
import { VastNodeResolution } from '../vast_build_visitor';
import { FunctionTypeRetrieval, FunctionTypeRetrievalResult } from './function_type_retrieval';
import { LetExpressionSubscriber } from './let_expression_publisher';

const { freeze } = Helpers;

function construct
  (mGetOwnInstanceRef: () => AstNodeVisitor<VastNodeResolution>,
   mObjectTable: ObjectLookUpTable,
   mLetSubscriber: LetExpressionSubscriber)
{
  function visitFunctionCall
    (node: AstFunctionCallNode, receiver: AstNode, fArgs: AstTupleNode): VastNodeResolution
  {
    const argsAsRes  = fArgs.visit(mGetOwnInstanceRef());
    const argsAsVast = argsAsRes.node();
    if (!argsAsVast) {
      return argsAsRes;
    }
    const funcRetr = FunctionTypeRetrieval.
      make(node, receiver,fArgs, mObjectTable, mLetSubscriber, argsAsVast as VastNode);
    const res = funcRetr.build();
    if (!res) {
      return freeze({
        node: () => undefined,
        errors: () => [funcRetr.error()]
      });
    }
    
    const errors: StandardErrorMessage[] = [];
    const { functionType, pushParameters, pushReceiver } = res as FunctionTypeRetrievalResult;
    // Need to re-enable this somehow?
    const parameters = pushParameters ? argsAsVast as VastNode : VastTupleNode.emptyTuple();
    const receiverToUseRes = (() => {
      if (pushReceiver) {
        return receiver.visit(mGetOwnInstanceRef());
      }
      return VastNodeResolution.makeForVastNode(VastTupleNode.emptyTuple());
    })();
    const receiverToUse = receiverToUseRes.node();
    if (!receiverToUse) {
      return receiverToUseRes;
    }
    VastFunctionCallNode.
      validateFunctionParameters(functionType, parameters.functionType().returns(), (message: string) => {
        errors.push(freeze({ message }));
      });
    if (errors.length > 0) {
      return freeze({
        node: () => undefined,
        errors: () => errors
      });
    }
    return VastNodeResolution.
      makeForVastNode(VastFunctionCallNode.make(functionType, receiverToUse as VastNode, parameters));
  }
  return freeze({ visitFunctionCall });
}

export const FunctionCallVisitorPart = freeze({ make: construct });
