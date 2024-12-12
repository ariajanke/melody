import { type AstLiteralNode } from './ast_fringe_node';
import { type AstFunctionCallNode } from './ast_function_call_node';
import { type AstFunctionDefinitionNode } from './ast_function_definition_node';
import { type AstIdentifierNode } from './ast_identifier_node';
import { type AstLetDeclarationNode } from './ast_let_declaration_node';
import { AstNode } from './ast_node';
import { type AstNodeVisitor } from './ast_node_visitor';
import { AstStringLiteralNode } from './ast_string_literal_node';
import { type AstTupleNode } from './ast_tuple_node';
import { ContextVariable } from './context_variable';
import { CallHandlingStrategies, IncompleteFunctionType } from './function_type';
import { Helpers } from './helpers';
import { ObjectType } from './object_type';
import { PersistentStack } from './persistent_stack';

const { freeze, memoize } = Helpers;

const class_ = freeze({
  stringPoolVisitor: memoize((): AstNodeVisitor<string[]> => {
    type Mappable<Type, ToType> = {
      map: (fn: (n: Type) => ToType) => ToType[]
    };
    const reduceToStrings = (mappable: Mappable<AstNode, string[]>) =>
      mappable.
        map((node: AstNode): string[] => node.visit(inst)).
        reduce((prev: string[], cur: string[]) =>
        {
          cur.push(...prev);
          return cur;
        });
    const inst = freeze({
      visitFunctionCall:
        (_0: AstFunctionCallNode, receiver: AstNode, fArgs: AstTupleNode): string[] =>
        [...receiver.visit(inst), ...fArgs.visit(inst)],
      visitLetDeclaration: (_0: AstLetDeclarationNode, rhs: AstNode): string[] =>
        rhs.visit(inst),
      visitIdentifier: (_0: AstIdentifierNode): string[] => [],
      visitTuple: reduceToStrings,
      visitFunctionDefinition: (_0: AstFunctionDefinitionNode, lineNodes: AstNode[]): string[] =>
        reduceToStrings(lineNodes),
      visitLiteral: (node: AstLiteralNode): string[] => {
        if (AstStringLiteralNode.hasCreated(  node )) { //.type() === AstNode.types.stringLiteral) {
          return [node.asString()];
        }
        return [];
      }
    });
    return inst;
  }),
  instance: memoize(() => {
    const type = ObjectType.make('String');
    type.setLookUp({ [':=']: IncompleteFunctionType.
      make().
      setCallStrategy( CallHandlingStrategies.noReceiver ).
      setName(':=').
      setParameters(type.decomposeAsParameters()).
      setReturns  ([ type ]).
      setBuiltin((_0: PersistentStack<ContextVariable>) => {}).
      finish() });
    return type;
  })
});

export const StringType = class_;