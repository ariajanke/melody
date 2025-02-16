import { Helpers } from '../helpers';
import { AstNode } from './ast_node';
import { type AstNodeVisitor } from './ast_node_visitor';
import { ObjectTypeResolution } from '../object_type_resolution';
import { ObjectLookUpTable } from '../object_look_up_table';
import { AstFringeNode } from './ast_fringe_node';
import { ContextType } from '../context_type';
import { ObjectType } from '../object_type';

const { freeze, memoize } = Helpers;

export interface AstIdentifierNode extends AstFringeNode {
  // contextMethodName: () => string
};

export const AstIdentifierNode = (() => {
  const { hasCreated, type } = AstNode.makeTypeClassMethods();
  
  function make(value: string): AstIdentifierNode {
    const inst = freeze({
      executionType: (oTable: ObjectLookUpTable): ObjectTypeResolution => {
        const ctxTypeRes = oTable.lookUpByName(ContextType.typeName());
        const ctxType = ctxTypeRes.resolve();
        if (!ctxType || value === ContextType.contextMethodName()) {
          return ctxTypeRes;
        }
        const funcType = ctxType.
          lookUp(`.${value}`)?.
          byParameters(ObjectType.emptyTupleInstance());
        if (!funcType) {
          return ObjectTypeResolution.
            makeForError(`"${value}" is not declared`);
        }
        return ObjectTypeResolution.makeFixedForType(funcType.returns());
      },
      type,
      asString: () => value,
      visit: <AccumulationType>(visitor: AstNodeVisitor<AccumulationType>): AccumulationType =>
        visitor.visitIdentifier(inst),
      asName: () => value,
      uid: memoize(Symbol)
    });
    return inst;
  }

  return freeze({ make, type, hasCreated });
})();
