import { AstNode, AstNodeVisitor } from './ast_node';
import { ContextVariable } from './context_variable';
import { Helpers } from './helpers';
import { ObjectLookUpTable } from './type_system';

const { freeze } = Helpers;

interface AstIntegerLiteralNode extends AstNode {

}

const AstIntegerLiteralNode = (() => {
  const kIntType = AstNode.types.integerLiteral;
  const kExIntType = ContextVariable.types.integer;

  function make(value: string): AstIntegerLiteralNode {
    return construct(Number.parseInt(value));
  }

  function construct(mValue: number) {
    function visit(_0: AstNodeVisitor) {}

    function type(): symbol { return kIntType; }

    function executionType(_0: ObjectLookUpTable): symbol
      { return kExIntType; }

    return freeze({ type, visit, executionType });
  }

  return freeze({ make });
})();
