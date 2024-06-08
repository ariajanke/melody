import { AstNode } from './ast_node';
import { Helpers, StandardErrorMessage } from './helpers';
import { AstNodeVisitorBuilder, type AstNodeVisitor } from './ast_node_visitor';
import { AstTupleNode } from './ast_tuple_node';
import { ExecutionContext } from './execution_context';

const { freeze } = Helpers;

interface AstTypesValidatorVisitor extends AstNodeVisitor {
  errors: () => Readonly<StandardErrorMessage[]>
}

// what's the difference between validation, and compliation?
const AstTypesValidatorVisitor = freeze({
  make: (mContext: ExecutionContext = ExecutionContext.make()):
    AstTypesValidatorVisitor =>
  {
    const mErrors: StandardErrorMessage[] = [];
    // prefer being explicit?
    const visitor = AstNodeVisitorBuilder.
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
    return freeze({
      ...visitor, // everyone will know I'm fucking stupid though
      errors: (): Readonly<StandardErrorMessage[]> => mErrors
    });
  }
});

export interface AstValidator {
  validate: (node: AstNode) => Readonly<StandardErrorMessage[]>
}

export const AstValidator = freeze({
  make: (mContext: ExecutionContext = ExecutionContext.make()) => {
    const validator = AstTypesValidatorVisitor.make(mContext);
    return freeze({
      validate: (node: AstNode): Readonly<StandardErrorMessage[]> => {
        node.visit(validator);
        return validator.errors();
      }
    });
  }
});
