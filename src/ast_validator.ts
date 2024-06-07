import { AstNode } from './ast_node';
import { AstLetDeclarationNode } from './ast_let_declaration_node';
import { AstFunctionCallNode } from './ast_function_call_node';
import { AstFringeNode } from './ast_fringe_node';
import { Helpers, StandardErrorMessage } from './helpers';
import { AstNodeVisitorBuilder, type AstNodeVisitor } from './ast_node_visitor';
import { AstTupleNode } from './ast_tuple_node';
import { ExecutionContext } from './execution_context';

const { freeze } = Helpers;

// what's the difference between validation, and compliation?
const AstTypesValidatorVisitor = freeze({
  make: (): AstNodeVisitor => {
    const mContext = ExecutionContext.make();
    const mErrors: StandardErrorMessage[] = [];
    const inst =
      AstNodeVisitorBuilder.
      makeDefaultingToStop().
      visitTuple((node: AstTupleNode) => {
        node.forEach((node: AstNode) => {
          const res = node.executionType( mContext );
          if (!res.resolve()) {
            const err = res.error();
            if (!err) {
              throw Error('at least one function must return something other ' +
                          'than undefined');
            }
            mErrors.push(err);
          }
        });
      }).
      finish();
    return inst;
  }
});

export const AstValidator = freeze({
  make: () => {

  }
});