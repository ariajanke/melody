import { AstNode, TypeLookUpTable } from './ast_node';
import { Helpers } from './helpers';
import { TypeResolution } from './type_resolution';
import { AstNodeVisitor } from './ast_node_visitor';

export interface AstBinaryOperatorNode extends AstNode {}

export const AstBinaryOperatorNode = (() => {
  const { freeze } = Helpers;
  const binaryOperatorType = AstNode.types.binaryOperator;

  // for rhs, I'm now entering the domain of evaluating expressions
  // as such time to read up then?

  return freeze({
    make: (op: string, lhs: AstNode, rhs: AstNode): AstBinaryOperatorNode => {
      const inst = freeze({
        visit: (visitor: AstNodeVisitor) => {
          visitor.visitBinaryOperation(op, inst, lhs, rhs);
        },
        type: () => binaryOperatorType,
        executionType: (types: TypeLookUpTable): TypeResolution => {
          // I need to "dress up" type look up table for lhs
          // I need permission for lhs type to be unresolved for let declarations
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
      });
      return inst;
    }
  });
})();
