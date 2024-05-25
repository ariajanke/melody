import { AstNode, AstNodeVisitor } from './ast_node';
import { AstStringableNode } from './ast_stringable_node';
import { ObjectLookUpTable, FunctionType, ParameterFit } from './type_system';

export interface AstBinaryOperatorNode extends AstNode {
  // assigneeName: () => string
}

export const AstBinaryOperatorNode = (() => {
  const { freeze } = Object;
  const assignmentType = AstNode.types.assignment;

  // for rhs, I'm now entering the domain of evaluating expressions
  // as such time to read up then?

  function make(op: string, lhs: AstNode, rhs: AstNode): AstBinaryOperatorNode {
    // const { asString } = AstStringableNode.downcast(lhs);
    const inst = freeze({ visit, type, executionType });//, assigneeName: asString });

    function visit(visitor: AstNodeVisitor) {
      visitor.visitBinaryOperation(op, lhs, rhs);
    }

    function type(): symbol {
      return assignmentType;
    }

    function executionType(objects: ObjectLookUpTable): symbol {
      // in order to resolve the execution type, there are several things that
      // I need to know
      // which function am I calling, and what is it's return type
      const lhsType = lhs.executionType(objects);
      const rhsType = rhs.executionType(objects);

      const func = objects.lookUpByType(lhsType).lookUp(op);
      const rhsObject = objects.lookUpByType(rhsType);
      // yuck temporary
      const rhsParams =
        [{ fit: ParameterFit.isType, fitName: rhsObject.name() }];
      const deg = FunctionType.
        satisfactionDegreeOfArguments(func.arguments_(), rhsParams);
      if (deg === 0) {
        return func.returns[0].typeUid as symbol;
      }
      throw Error('incompatible');
    }

    return inst;
  }

  return freeze({ make });
})();
