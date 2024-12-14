import { AstNode } from './ast_node';
import { AstLiteralNode } from './ast_fringe_node';
import { Helpers } from './helpers';
// import { ContextVariable } from './context_variable';
import { type Token } from './token';
import { type AstNodeVisitor } from './ast_node_visitor';
import { type ObjectTypeResolution } from './object_type_resolution';
import { ObjectLookUpTable } from './object_look_up_table';
import { StringPool } from './context_type';

const { freeze, memoize } = Helpers;

export const AstStringLiteralNode = (() => {
  const { type, hasCreated } = AstNode.makeTypeClassMethods();

  function make(mValue: string): AstLiteralNode {
    mValue = (() => {
      if (mValue.length <= 2) {
        throw Error('not a valid string');
      }
      return mValue.substring(1, mValue.length - 1);
    })();
    const mGetAsContextVar = (stringPool: StringPool) => { //memoize(() => ContextVariable.make(mValue));
      return stringPool.lookUp(mValue) ?? (() => {
        throw new Error(`String "${mValue}" not in string pool`)
      })();
    }
    const inst = freeze({
      comesBeforeOperator: (operator: Token): boolean =>
        operator.content() === ',',
      executionType: (types: ObjectLookUpTable): ObjectTypeResolution =>
        types.lookUpByName('String'),
      // evaluate: //(_0: (name: string) => ContextVariable): ContextVariable =>
      //   memoize(() => ContextVariable.make(mValue)),
      type,
      asString: () => mValue,
      visit: <AccumulationType>(visitor: AstNodeVisitor<AccumulationType>): AccumulationType =>
        visitor.visitLiteral(inst),
      value: mGetAsContextVar
    });
    return inst;
  }

  return freeze({ make, type, hasCreated });
})();
