import { AstEvaluatableNode, AstNode } from './ast_node';
import { Helpers, StandardErrorMessage } from './helpers';
import { AstNodeVisitorBuilder, type AstNodeVisitor } from './ast_node_visitor';
import { AstTupleNode } from './ast_tuple_node';
import { ExecutionContext } from './execution_context';
import { AstLetDeclarationNode } from './ast_let_declaration_node';
import { AstBinaryOperatorNode } from './ast_binary_operator_node';
import { AstIdentifierNode } from './ast_identifier_node';
import { AstFringeNode } from './ast_fringe_node';
import { AstFunctionCallNode } from './ast_function_call_node';

const { freeze, memoize } = Helpers;

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
  make: (mContext: ExecutionContext,
         mGeneralValidator: AstValidatorVisitor): AstValidatorVisitor =>
  {
    const mErrors: StandardErrorMessage[] = [];
    const visitor = AstNodeVisitorBuilder.
      makeDefaultingToStop().
      visitBinaryOperation((op: string, _1: AstBinaryOperatorNode, lhs: AstNode, rhs: AstNode) => {
        if (op !== ':=') {
          mErrors.push({ message: `Cannot use operator "${op}" in a let declaration` });
          return;
        }
        if (lhs.type() != AstNode.types.identifier) {
          mErrors.push({ message: `Cannot use ${AstNode.typeToString(lhs.type())} to name a variable` });
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
          mErrors.push({ message: `Cannot deduce type of ${AstNode.typeToString(rhs.type())} node` });
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
        mErrors.push(typeRes.error() as StandardErrorMessage);
      }).
      finish();
    return freeze({
      ...visitor,
      errors: (): Readonly<StandardErrorMessage[]> => {
        return mErrors;
      }
    });
  }
});

const AstGeneralValidator = freeze({
  make: (mContext: ExecutionContext,
         // NOTE: expected to always return the same instance of a let validator
         //       must not be called in constructor!
         mGetMemoizedLetValidator: () => AstValidatorVisitor):
    AstValidatorVisitor =>
  {
    const mErrors: StandardErrorMessage[] = [];
    const visitor = AstNodeVisitorBuilder.
      makeDefaultingToStop().
      visitFunctionCall((_0: AstFunctionCallNode) => {
        ;
      }).
      visitBinaryOperation((_0: string, binNode: AstBinaryOperatorNode, _2: AstNode, _3: AstNode) => {
        const typeRes = binNode.executionType( mContext );
        const type = typeRes.resolve();
        if (type) { return; }
        mErrors.push(typeRes.error() as StandardErrorMessage);
      }).
      visitLetDeclaration((node: AstLetDeclarationNode, _1: AstNode) => {
        node.visit(mGetMemoizedLetValidator());
      }).
      visitIdentifier((node: AstFringeNode) => {
        const typeRes = node.executionType( mContext );
        const type = typeRes.resolve();
        if (type) { return; }
        mErrors.push(typeRes.error() as StandardErrorMessage);
      }).
      visitTuple((node: AstTupleNode) => {
        node.forEach((node: AstNode) => { node.visit(visitor); })
      }).
      finish();
    return freeze({
      ...visitor,
      errors: (): Readonly<StandardErrorMessage[]> => {
        const letValErrors = mGetMemoizedLetValidator().errors();
        if (letValErrors.length > 0)
          return letValErrors;
        return mErrors;
      }
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

// const something = freeze({
//   make: () => {
//     const mErrors: StandardErrorMessage[] = [];
//     const mContext = ExecutionContext.make();
//     const binval = AstLetBinaryOperatorValidatorVisitor.make(mContext);
//     const mLetsVal = AstLetsValidatorVisitor.make(binval);

//     AstNodeVisitorBuilder.
//       makeDefaultingToStop().
//       visitLetDeclaration((node: AstLetDeclarationNode) => {
//         node.visit(mLetsVal);
//       }).
//       finish();

//     return freeze({
//       validateStatement: (node: AstNode) => {
//         ({
//           [AstNode.types.binaryOperator]: 'binary operator',
//           [AstNode.types.tuple         ]: 'tuple',
//           [AstNode.types.stringLiteral ]: 'string literal',
//           [AstNode.types.identifier    ]: 'identifier',
//           [AstNode.types.letDeclaration]: 'declaration',
//           [AstNode.types.integerLiteral]: 'integer literal'
//         })
//         if (node.type() === AstNode.types.letDeclaration) {

//         }
//         // visit for let here
//         mLetsVal
//         // type resolve whole statement
//         const res = node.executionType( mContext );
//         if (!res.resolve()) {
//           const err = res.error();
//           if (!err) {
//             throw Error('at least one function must return something other ' +
//                         'than undefined');
//           }
//           mErrors.push(err);
//         }
//       }
//     });
//   }
// })

export interface AstValidator {
  validate: (node: AstNode) => Readonly<StandardErrorMessage[]>
}

export const AstValidator = freeze({
  make: (mContext: ExecutionContext = ExecutionContext.make()) => {
    // side by side! line by line
    // 
    // const letBinaryOpValidator = AstLetBinaryOperatorValidatorVisitor.make(mContext);
    // const letValidator = AstLetsValidatorVisitor.make(letBinaryOpValidator);
    // const validator = AstTypesValidatorVisitor.make(mContext);
    const genVal = AstGeneralValidator.make( mContext, memoize(() => {
      const binLetVal = AstLetBinaryOperatorValidatorVisitor.make(mContext, genVal);
      return AstLetsValidatorVisitor.make(binLetVal);
    }) );

    return freeze({
      validate: (node: AstNode): Readonly<StandardErrorMessage[]> => {
        node.visit(genVal);
        return genVal.errors();
        // node.visit(validator);
        // let errors = validator.errors();
        // if (errors.length > 0) return errors;
        // return letValidator.errors();
      }
    });
  }
});
