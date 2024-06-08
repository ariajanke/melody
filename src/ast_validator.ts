import { AstNode } from './ast_node';
import { Helpers, StandardErrorMessage } from './helpers';
import { AstNodeVisitorBuilder, type AstNodeVisitor } from './ast_node_visitor';
import { AstTupleNode } from './ast_tuple_node';
import { ExecutionContext } from './execution_context';
import { AstLetDeclarationNode } from './ast_let_declaration_node';
import { AstBinaryOperatorNode } from './ast_binary_operator_node';

const { freeze } = Helpers;

interface AstValidatorVisitor extends AstNodeVisitor {
  errors: () => Readonly<StandardErrorMessage[]>
}

// what's the difference between validation, and compliation?
const AstTypesValidatorVisitor = freeze({
  make: (mContext: ExecutionContext):
    AstValidatorVisitor =>
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
      ...visitor,
      errors: (): Readonly<StandardErrorMessage[]> => mErrors
    });
  }
});

const AstLetBinaryOperatorValidatorVisitor = freeze({
  make: (mContext: ExecutionContext): AstValidatorVisitor => {
    const mErrors: StandardErrorMessage[] = [];
    const visitor = AstNodeVisitorBuilder.
      makeDefaultingToStop().
      visitBinaryOperation((op: string, lhs: AstNode, _2: AstNode) => {
        if (op !== ':=') {
          mErrors.push({ message: `Cannot use operator "${op}" in a let declaration` });
          return;
        }
        if (lhs.type() != AstNode.types.identifier) {
          mErrors.push({ message: `Cannot use ${AstNode.typeToString(lhs.type())} to name a variable` });
          return;
        }
      }).
      finish();
    return freeze({
      ...visitor,
      errors: (): Readonly<StandardErrorMessage[]> => mErrors
    });
  }
});

const AstLetsValidatorVisitor = freeze({
  make: (mBinaryOperatorVisitor: AstValidatorVisitor):
    AstValidatorVisitor =>
  {
    const mErrors: StandardErrorMessage[] = [];
    const visitor = AstNodeVisitorBuilder.
      makeDefaultingToStop().
      visitLetDeclaration((_0: AstLetDeclarationNode, node: AstNode) => {
        if (node.type() !== AstNode.types.binaryOperator) {
          mErrors.push({ message: `Cannot declare using a(n) ${AstNode.typeToString(node.type())}` });
          return;
        }
        node.visit(mBinaryOperatorVisitor);
      }).
      finish();
    return freeze({
      ...visitor,
      errors: (): Readonly<StandardErrorMessage[]> => mErrors
    });
  }
});

export interface AstValidator {
  validate: (node: AstNode) => Readonly<StandardErrorMessage[]>
}

export const AstValidator = freeze({
  make: (mContext: ExecutionContext = ExecutionContext.make()) => {
    const letBinaryOpValidator = AstLetBinaryOperatorValidatorVisitor.make(mContext);
    const letValidator = AstLetsValidatorVisitor.make(letBinaryOpValidator);
    const validator = AstTypesValidatorVisitor.make(mContext);
    return freeze({
      validate: (node: AstNode): Readonly<StandardErrorMessage[]> => {
        node.visit(validator);
        let errors = validator.errors();
        if (errors.length > 0) return errors;
        return letValidator.errors();
      }
    });
  }
});
