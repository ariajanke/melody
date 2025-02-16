import { AstNode } from './ast_node';
import { Helpers } from '../helpers';
import { AstLiteralNode } from './ast_fringe_node';
import { AstNodeVisitor } from './ast_node_visitor';
import { type ObjectTypeResolution } from '../object_type_resolution';
import { ObjectLookUpTable } from '../object_look_up_table';
import { type StringPool } from '../string_pool';

const { freeze, memoize } = Helpers;

interface AstIntegerLiteralNode extends AstLiteralNode {}

export const AstIntegerLiteralNode = (() => {
  const { hasCreated, type } = AstNode.makeTypeClassMethods();

  function make(value: string): AstLiteralNode {
    const asNum = Number.parseInt(value);
    if (Number.isNaN(asNum)) {
      throw new Error(`Cannot use "${value}" as an integer`);
    }
    return construct(asNum);
  }

  function construct(mValue: number): AstLiteralNode {
    if (Number.isNaN(mValue)) {
      throw new Error('Cannot use NaN as an integer');
    }
    const inst = freeze({
      visit: <AccumulationType>(visitor: AstNodeVisitor<AccumulationType>): AccumulationType =>
        visitor.visitLiteral(inst),
      type,
      executionType: (types: ObjectLookUpTable): ObjectTypeResolution =>
        types.lookUpByName('Integer'),
      asString: (): string => `${mValue}`,
      value: (_0: StringPool) => mValue,
      uid: memoize(Symbol),
      asName: () => undefined
    });
    return inst;
  }

  return freeze({ make, type, hasCreated });
})();
