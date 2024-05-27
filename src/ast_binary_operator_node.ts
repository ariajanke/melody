import { AstNode, AstNodeVisitor, TypeLookUpTable } from './ast_node';
import { Helpers } from './helpers';
import { ObjectType } from './object_type';

export interface AstBinaryOperatorNode extends AstNode {}

export const AstBinaryOperatorNode = (() => {
  const { freeze } = Helpers;
  const binaryOperatorType = AstNode.types.binaryOperator;

  // for rhs, I'm now entering the domain of evaluating expressions
  // as such time to read up then?

  function make(op: string, lhs: AstNode, rhs: AstNode): AstBinaryOperatorNode {
    const inst = freeze({ visit, type, executionType });

    function visit(visitor: AstNodeVisitor) {
      visitor.visitBinaryOperation(op, lhs, rhs);
    }

    function type(): symbol {
      return binaryOperatorType;
    }

    function executionType(types: TypeLookUpTable): ObjectType {
      // in order to resolve the execution type, there are several things that
      // I need to know
      // which function am I calling, and what is it's return type
      const lhsType = lhs.executionType(types);
      const rhsType = rhs.executionType(types);

      const func = lhsType.lookUp(op);
      const rhsAsSingluarParameter = rhsType.asSingluarParameter();
      const deg = func.satisfactionDegreeOfArguments(rhsAsSingluarParameter);
      if (deg === 0) {
        return func.returns()[0];
      }
      throw Error('incompatible');
    }

    return inst;
  }

  return freeze({ make });
})();
