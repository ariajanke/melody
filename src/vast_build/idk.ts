import { AstNodeVisitor } from './ast_node_visitor';
import { type AstLetDeclarationNode } from './ast_let_declaration_node';
import { type AstNode } from './ast_node';
import { AstLiteralNode } from './ast_fringe_node';
import { AstFunctionCallNode } from './ast_function_call_node';
import { AstTupleNode } from './ast_tuple_node';
import { AstIdentifierNode } from './ast_identifier_node';
import { AstFunctionDefinitionNode } from './ast_function_definition_node';
import { LetDeclarationsRetrieval, LetNameElement } from './let_declarations_retrieval';
import { Helpers } from '../helpers';
import { IncompleteFunctionType } from '../function_type';
import { TupleObjectFactory } from '../tuple_type';
import { AstStringLiteralNode } from './ast_string_literal_node';
import { AstIntegerLiteralNode } from './ast_integer_literal_node';
import { IntegerType } from '../integer_type';
import { StringType } from '../string_type';
import { StringPool } from '../string_pool';
import { VariableDeclaration } from '../variable_declaration';

const { freeze, memoize } = Helpers;

interface IastNode {};

interface Something {
  add(lne: LetNameElement): void
  finish(): Readonly<IastLetName[]>
  push(): Something
};

type IastFunctionBody = {};
type IastLetName = {};
const IastFunctionBody = freeze({
  make(lnes: Readonly<IastLetName>, nodes: Readonly<IastNode[]>) {

  }
});

const IastTupleNode = freeze({
  emptyTuple: (() => {
    let memd: IastNode | undefined = undefined;
    return (): IastNode => memd ??= IastTupleNode.make([]);
  })(),
  make(nodes: Readonly<IastNode[]>): IastNode {
    return freeze({});
  }
});

const IastFunctionCall = freeze({
  contextReceiverNode: memoize((): IastNode => freeze({})),
  make(receiver: IastNode, name: string, args: IastNode): IastNode {
    return freeze({

    });
  }
});

const IastStringLiteralNode = freeze({
  make(value: string): IastNode {
    return freeze({});
  }
});

const IastIntegerLiteralNode = freeze({
  make(value: number): IastNode {
    return freeze({});
  }
});

const StringPrinter = freeze({
  make() {
    let s = '';
    return freeze({
      append(in_: string): void {
        s = s + in_;
      },
      print: () => s
    });
  }
})
type StringPrinter = ReturnType<typeof StringPrinter.make>;

function make(s: Something, pool: StringPool, printer: StringPrinter) {
  const inst: AstNodeVisitor<IastNode> = {
    visitLetDeclaration(node: AstLetDeclarationNode, rhs: AstNode) {
      const { elements, error } = LetDeclarationsRetrieval.make(node);
      const e = elements();
      // in this block, have elements
      // create initial set calls
      // strip lets
      elements()?.forEach(s.add) ?? 'idk';
      // need to name initial set
      const idnode = AstIdentifierNode.make('stuff');
      const transformedNode = AstFunctionCallNode.
        makeWithContextReceiver(idnode , rhs );
      if (e) {
      }
      return s;
    },
    visitFunctionCall:
      (node: AstFunctionCallNode, receiver: AstNode, fArgs: AstTupleNode) =>
    {
      // a := 10 <- who is the receiver?
      // call ".a(Integer)"?
      const name = node.alwaysAsName();
      printer.append(`(call "${name}" on (`);

      if (receiver.type() === AstFunctionCallNode.contextReceiver().type()) {
        ;
      } else {
        receiver.visit(inst);
      }
      
      printer.append(') with (')
      fArgs.visit(inst);
      printer.append(')');
      return s;
    },
    visitIdentifier: (node: AstIdentifierNode): IastNode => {
      const name = node.asName() ?? (() => {
        throw new Error('Identifier with no name!');
      })();
      printer.append(`(call "${name} on <CONTEXT> with ()`);
      return IastFunctionCall.
        make(IastFunctionCall.contextReceiverNode(),
             name,
             IastTupleNode.emptyTuple());
    },
    visitTuple: (node: AstTupleNode): IastNode => {
      return IastTupleNode.make(
        node.map((node: AstNode) => node.visit(inst)));
    },
    visitFunctionDefinition: (node: AstFunctionDefinitionNode, lineNodes: AstNode[]) =>
    {
      // boundry
      const something = s.push();
      const subInst = make(something, pool, printer);
      lineNodes.forEach((node: AstNode) => node.visit(subInst));
      IastFunctionBody.make(  );
      return s;
    },
    visitLiteral: (node: AstLiteralNode): IastNode => {
      if (node.type() === AstStringLiteralNode.type()) {
        printer.append
        return IastStringLiteralNode.make(node.asString());
      } else if (node.type() === AstIntegerLiteralNode.type()) {
        return IastIntegerLiteralNode.make(Number(node.asString));
      }
      throw new Error('unhandled');
      
    }
  };
  return inst;
}
