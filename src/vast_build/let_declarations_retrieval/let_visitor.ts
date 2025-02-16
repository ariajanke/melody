import { AstNode } from '../ast_node';
import { AstFunctionCallNode } from '../ast_function_call_node';
import { Helpers } from '../../helpers';
import { AstLetDeclarationNode } from '../ast_let_declaration_node';
import { AstNodeVisitor } from '../ast_node_visitor';
import { AstTupleNode } from '../ast_tuple_node';
import { AstFunctionDefinitionNode } from '../ast_function_definition_node';
import { LetNamesCollector } from './let_names_collector';
import { NamingExpressionVisitor } from './naming_expression_visitor';
import { AstIdentifierNode } from '../ast_identifier_node';
import { AstLiteralNode } from '../ast_fringe_node';

const { freeze } = Helpers;

const DependeeNameRetrieval = (() => {
  function make(): AstNodeVisitor<string[]> {
    const inst = freeze({
      visitFunctionCall(_0: AstFunctionCallNode, receiver: AstNode, fArgs: AstTupleNode): string[] {
        const names = fArgs.
          map((node: AstNode) => node.visit(inst)).
          reduce((prev: string[], cur: string[]) => prev.concat(cur), []);
        return [...names, ...receiver.visit(inst)];
      },
      visitLetDeclaration: (_0: AstLetDeclarationNode, _1: AstNode) =>
        { throw new Error('no nested lets allowed'); },
      visitIdentifier: (node: AstIdentifierNode) =>
        [node.asString()],
      visitTuple: (tuple: AstTupleNode): string[] => {
        const names = tuple.
          map((node: AstNode) => node.visit(inst)).
          reduce((prev: string[], cur: string[]) => prev.concat(cur), []);
        return names;
      },
      visitFunctionDefinition: (_0: AstFunctionDefinitionNode, _1: AstNode[]) =>
        { return []; },
      visitLiteral: (_0: AstLiteralNode) =>
        { return []; }
    });
    return inst;
  }

  return freeze({ make });
})();

// misnomer
export const LetVisitor = (() => {
  function make(): AstNodeVisitor<LetNamesCollector> {
    const inst = freeze({
      visitFunctionCall(callNode: AstFunctionCallNode, receiver: AstNode, fArgs: AstTupleNode) {
        // receiver('s name) is being named by fArgs
        const res = receiver.visit(NamingExpressionVisitor.make());
        if (!res.names()) {
          throw new Error(res.error().message);
        }
        const names = [...res.names() as Readonly<string[]>];
        const dependeeNames = fArgs.visit(DependeeNameRetrieval.make());
        return LetNamesCollector.
          make(names, callNode.alwaysAsName(), dependeeNames, fArgs);
      },
      visitLetDeclaration: (_0: AstLetDeclarationNode, _1: AstNode) =>
        LetNamesCollector.makeErroneous('no nested lets allowed'),
      visitIdentifier: (_0: AstIdentifierNode) =>
        LetNamesCollector.makeErroneous('missing operator "=" or ":="'),
      visitTuple: (_0: AstTupleNode) => LetNamesCollector.
        makeErroneous('nott supported'), // maybe for function param tuples?
      visitFunctionDefinition: (_0: AstFunctionDefinitionNode, _1: AstNode[]) =>
        LetNamesCollector.makeErroneous('fn def doesn\'t make sense here'),
      visitLiteral: (_0: AstLiteralNode) =>
        LetNamesCollector.makeErroneous('cannot use literal as a name')
    });
    return inst;
  }

  return freeze({ make });
})();
