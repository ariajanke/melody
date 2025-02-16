import { Helpers, StandardErrorMessage } from '../../helpers';
import { ObjectLookUpTable } from '../../object_look_up_table';
import { VastFunctionDefinitionNode } from '../../vast_function_definition_node';
import { VastNode } from '../../vast_node';
import { AstFunctionDefinitionNode } from '../ast_function_definition_node';
import { AstNode } from '../ast_node';
import { LetDeclarationsRetrieval } from '../let_declarations_retrieval';
import { ProgressedLetElement, VastNodeResolution } from '../vast_build_visitor';
import { type AstNodeVisitor } from '../ast_node_visitor';
import { WritableObjectType } from '../../writable_object_type';
import { DeclarationFunctionTableBuilder } from '../declaration_function_table_builder';

const { freeze, memoize } = Helpers;

export type ProgressedLetElementTable = {
  [uid: symbol]: ProgressedLetElement[]
};

export type DeeperInstFactory =
  (mWritableContextType: WritableObjectType) => AstNodeVisitor<VastNodeResolution>;

function construct
  (mMakeDeeperInstance: DeeperInstFactory,
   mObjectTable: ObjectLookUpTable,
   mStartContextType: () => WritableObjectType)
{
  function visitFunctionDefinition(node: AstFunctionDefinitionNode, lineNodes: AstNode[]):
    VastNodeResolution
  {
    // LetDeclarations are to generate function setters and getters
    const retrieval = LetDeclarationsRetrieval.make(node);
    const elements = retrieval.elements();
    if (!elements) {
      return freeze({
        node: () => undefined,
        errors: memoize(() => [retrieval.error()])
      });
    }

    const errors: StandardErrorMessage[] = [];
    // need to temporarily define on the object table the context type that
    // the deeper instance defines
    const startedContext = mStartContextType();
    return mObjectTable.
      temporarilyDefineType(startedContext.objectType(), () =>
    {
      const deeperInst = mMakeDeeperInstance(startedContext);
      const dftb = DeclarationFunctionTableBuilder.
        make(deeperInst, elements);
      dftb.build(startedContext);

      if (errors.length > 0) {
        return freeze({
          node: () => undefined,
          errors: () => errors
        });
      }
      const vnodeRes = lineNodes.map((node: AstNode) => node.visit(deeperInst) );
      const vnodes: VastNode[] = [];
      vnodeRes.forEach((res: VastNodeResolution) => {
        const node = res.node();
        if (node) {
          vnodes.push(node);
          return;
        }
        errors.push(...res.errors());
      });
      
      // take those vast nodes, and build a context
      if (errors.length > 0) {
        return freeze({
          node: () => undefined,
          errors: () => errors
        });
      }
      const funcFuncType = mObjectTable.lookUpByName('Function').resolve();
      if (!funcFuncType) {
        throw new Error('No "Function" type, but it is supposed to be built in.');
      }
      return VastNodeResolution.
        makeForVastNode(VastFunctionDefinitionNode.make(vnodes, funcFuncType));
    });
  }
  return freeze({ visitFunctionDefinition });
}

export const FunctionDefinitionVisitorPart = freeze({ make: construct });
