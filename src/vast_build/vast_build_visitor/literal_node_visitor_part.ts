import { Helpers } from '../../helpers';
import { ObjectLookUpTable } from '../../object_look_up_table';
import { StringPool } from '../../string_pool';
import {
  VastIntegerLiteralNode,
  VastStringLiteralNode
} from '../../vast_literal_node';
import { AstLiteralNode } from '../ast_fringe_node';
import { AstIntegerLiteralNode } from '../ast_integer_literal_node';
import { AstStringLiteralNode } from '../ast_string_literal_node';
import { VastNodeResolution } from '../vast_build_visitor';

const { freeze } = Helpers;

function construct
  (mStringPool: StringPool, mObjectTable: ObjectLookUpTable)
{
  function visitLiteral(node: AstLiteralNode): VastNodeResolution {
    const asLiteralNode = (node as AstLiteralNode);
    if (AstStringLiteralNode.hasCreated(node)) {
      const res = mObjectTable.lookUpByName('String');
      const stringType = res.resolve();
      if (!stringType) {
        return freeze({
          node: () => undefined,
          errors: () => [res.error()]
        });
      }
      return VastNodeResolution.makeForVastNode(VastStringLiteralNode.
        make(stringType, asLiteralNode.value(mStringPool)));
    }
    if (!AstIntegerLiteralNode.hasCreated(node)) {
      return freeze({
        node: () => undefined,
        errors: () => [freeze({ message: 'literal nodes must be either strings or integers' })]
      });
    }
    const res = mObjectTable.lookUpByName('Integer');
    const intType = res.resolve();
    if (!intType) {
      return freeze({
        node: () => undefined,
        errors: () => [res.error()]
      });
    }
    return VastNodeResolution.makeForVastNode(VastIntegerLiteralNode.
      make(intType, asLiteralNode.value(mStringPool)));
  }
  return freeze({ visitLiteral });
}

export const LiteralNodeVisitorPart = freeze({ make: construct });
