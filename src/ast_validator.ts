import { AstEvaluatableNode, AstNode } from './ast_node';
import { Helpers, StandardErrorMessage } from './helpers';
import { AstNodeVisitorBuilder, type AstNodeVisitor } from './ast_node_visitor';
import { AstTupleNode } from './ast_tuple_node';
import { ExecutionContext } from './execution_context';
import { AstLetDeclarationNode } from './ast_let_declaration_node';
import { AstBinaryOperatorNode } from './ast_binary_operator_node';
import { AstFringeNode } from './ast_fringe_node';
import { AstFunctionCallNode } from './ast_function_call_node';

const { freeze, memoize } = Helpers;

interface AstValidatorVisitor extends AstNodeVisitor {
  errors: () => Readonly<StandardErrorMessage[]>
}

interface ErrorsCollector {
  pushMessage: (msg: string) => void,
  errors: () => Readonly<StandardErrorMessage[]>
}

const ErrorsCollector = freeze({
  make: () => {
    const mErrors: StandardErrorMessage[] = [];
    return freeze({
      pushMessage: (message: string): void => {
        mErrors.push({ message });
      },
      errors: (): Readonly<StandardErrorMessage[]> => mErrors
    });
  }
});

const AstLetBinaryOperatorValidatorVisitor = freeze({
  make: (mContext: ExecutionContext,
         mGeneralValidator: AstValidatorVisitor,
         mErrorsCollector: ErrorsCollector):
    AstValidatorVisitor =>
  {
    const visitor = AstNodeVisitorBuilder.
      makeDefaultingToStop().
      visitBinaryOperation((node: AstBinaryOperatorNode, lhs: AstNode, rhs: AstNode) => {
        if (node.operation() !== ':=') {
          mErrorsCollector.
            pushMessage(`Cannot use operator "${node.operation()}" in a let declaration`);
          return;
        }
        if (lhs.type() !== AstNode.types.identifier) {
          mErrorsCollector.
            pushMessage(`Cannot use ${AstNode.typeToString(lhs.type())} to name a variable`);
          return;
        }
        const declaredVar = mContext.declareVariable((lhs as AstFringeNode).asString());
        rhs.visit(mGeneralValidator);
        if (mGeneralValidator.errors().length > 0) {
          return;
        }
        // rhs has now been *fully* validated, without error
        const forceAsEvaluatable = (): AstEvaluatableNode | undefined =>
          rhs as AstEvaluatableNode;
        const failToCase = (): AstEvaluatableNode | undefined =>
          undefined;
        const evalNode = ({
          [AstNode.types.binaryOperator]: forceAsEvaluatable,
          [AstNode.types.tuple         ]: failToCase,
          [AstNode.types.stringLiteral ]: forceAsEvaluatable,
          [AstNode.types.identifier    ]: forceAsEvaluatable,
          [AstNode.types.letDeclaration]: forceAsEvaluatable,
          [AstNode.types.integerLiteral]: forceAsEvaluatable
        })[rhs.type()]();
        if (!evalNode) {
          mErrorsCollector.
            pushMessage(`Cannot deduce type of ${AstNode.typeToString(rhs.type())} node`);
          return;
        }
        const typeRes = evalNode.executionType(mContext);
        const rhsType = typeRes.resolve();
        if (rhsType) {
          declaredVar.setType(rhsType);
          // we know rhs, and lhs become rhs' type
          // we declared lhs, and are totally, totally done
          return;
        }
        mErrorsCollector.pushMessage(typeRes.error()?.message as string);
      }).
      finish();
    return freeze({
      ...visitor,
      errors: mErrorsCollector.errors
    });
  }
});

const AstGeneralValidator = freeze({
  make: (mContext: ExecutionContext,
         mErrorsCollector: ErrorsCollector,
         // NOTE: expected to always return the same instance of a let validator
         //       must not be called in constructor!
         mGetMemoizedLetValidator: () => AstValidatorVisitor):
    AstValidatorVisitor =>
  {
    const visitor = AstNodeVisitorBuilder.
      makeDefaultingToStop().
      visitFunctionCall((_0: AstFunctionCallNode) => {
        throw Error('unimplemented');
      }).
      visitBinaryOperation((binNode: AstBinaryOperatorNode, _2: AstNode, _3: AstNode) => {
        const typeRes = binNode.executionType( mContext );
        const type = typeRes.resolve();
        if (type) { return; }
        mErrorsCollector.pushMessage(typeRes.error()?.message as string);
      }).
      visitLetDeclaration((node: AstLetDeclarationNode, _1: AstNode) => {
        node.visit(mGetMemoizedLetValidator());
      }).
      visitIdentifier((node: AstFringeNode) => {
        const typeRes = node.executionType( mContext );
        const type = typeRes.resolve();
        if (type) { return; }
        mErrorsCollector.pushMessage(typeRes.error()?.message as string);
      }).
      visitTuple((node: AstTupleNode) =>
        node.forEach((node: AstNode) => { node.visit(visitor); })).
      finish();
    return freeze({
      ...visitor,
      errors: mErrorsCollector.errors
    });
  }
});

const AstLetsValidatorVisitor = freeze({
  make: (mBinaryOperatorVisitor: AstValidatorVisitor,
         mErrorsCollector: ErrorsCollector):
    AstValidatorVisitor =>
  {
    const visitor = AstNodeVisitorBuilder.
      makeDefaultingToStop().
      visitLetDeclaration((_0: AstLetDeclarationNode, node: AstNode) => {
        if (node.type() !== AstNode.types.binaryOperator) {
          mErrorsCollector.
            pushMessage(`Cannot declare using a(n) ${AstNode.typeToString(node.type())}`);
          return;
        }
        node.visit(mBinaryOperatorVisitor);
      }).
      finish();
    return freeze({
      ...visitor,
      errors: mErrorsCollector.errors
    });
  }
});

export interface AstValidator {
  validate: (node: AstNode) => Readonly<StandardErrorMessage[]>
}

export const AstValidator = freeze({
  make:
    (mContext: ExecutionContext = ExecutionContext.make(),
     mErrorsCollector: ErrorsCollector = ErrorsCollector.make()) =>
  {
    const mGeneralValidator = AstGeneralValidator.
      make(mContext,
           mErrorsCollector,
           memoize(() => {
            const binLetVal = AstLetBinaryOperatorValidatorVisitor.
              make(mContext, mGeneralValidator, mErrorsCollector);
            return AstLetsValidatorVisitor.make(binLetVal, mErrorsCollector);
           }));

    return freeze({
      validate: (node: AstNode): Readonly<StandardErrorMessage[]> => {
        node.visit(mGeneralValidator);
        return mErrorsCollector.errors();
      }
    });
  }
});
