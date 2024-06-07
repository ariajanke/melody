import { AstNode, AstNodeVisitor, TypeLookUpTable } from './ast_node';
import { Helpers } from './helpers';
import { TypeResolution } from './type_resolution';

export interface AstBinaryOperatorNode extends AstNode {}

export const AstBinaryOperatorNode = (() => {
  const { freeze } = Helpers;
  const binaryOperatorType = AstNode.types.binaryOperator;

  // for rhs, I'm now entering the domain of evaluating expressions
  // as such time to read up then?

  return freeze({
    make: (op: string, lhs: AstNode, rhs: AstNode): AstBinaryOperatorNode => {
      return freeze({
        visit: (visitor: AstNodeVisitor) => {
          visitor.visitBinaryOperation(op, lhs, rhs);
        },
        type: () => binaryOperatorType,
        executionType: (types: TypeLookUpTable): TypeResolution => {
          // in order to resolve the execution type, there are several things that
          // I need to know
          // which function am I calling, and what is it's return type
          const lhsRes = lhs.executionType(types);
          const lhsType = lhsRes.resolve();
          if (!lhsType) {
            return lhsRes;
          }
          const rhsRes = rhs.executionType(types);
          const rhsType = rhsRes.resolve();
          if (!rhsType) {
            return rhsRes;
          }
  
          return TypeResolution.
            makeFunctionResolution(lhsType, op, rhsType.asSingluarParameter());
        }
      })
    }
  });
})();
