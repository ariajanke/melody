import { AstBuild } from './ast_build';
import { AstNodeVisitor, AstNode } from './ast_node';
import { Context } from './context';
import { AstStringableNode } from './ast_stringable_node';
import { Tokenization } from './tokenization';
import { AstFunctionCallNode } from './ast_function_call_node';
import { AstAssignmentNode } from './ast_assignment_node';
import { Helpers } from './helpers';
import { AstLetDeclarationNode } from './ast_let_declaration_node';

const { freeze } = Object;

export interface Interpreter extends AstNodeVisitor {

};

export const Interpreter = freeze({ make, buildFor });

const injections = freeze({ putsFunction: console.log });

function make(context: Context = Context.make(), { putsFunction } = injections): Interpreter {
  const nodeTypes = AstNode.types;
  function visitFunctionCall(node: AstFunctionCallNode) {
    if (node.name === 'puts') {
      node.arguments.forEach((node: AstNode) => {
        putsFunction(getValueOf(node as AstStringableNode));
      });
    }
  }

  function getValueOf(node: AstStringableNode): string {
    const val = node.asString();
    switch (node.type()) {
    case nodeTypes.stringLiteral:
      return val;
    case nodeTypes.identifier:
      return context.getValueOfVariable(val) ?? (() => {
        throw Error(`variable ${val} not declared`);
      })();
    default: break;
    }
    throw Error('impossible branch??');
  }

  function visitLetDeclaration(letNode: AstLetDeclarationNode) {
    //letNode.
  }

  function visitAssignment(node: AstAssignmentNode, rhs: AstNode) {
    context.setVariable(node.assigneeName(), getValueOf(rhs as AstStringableNode));
  }

  return freeze({ visitFunctionCall, visitLetDeclaration, visitAssignment });
}

function buildFor(inp: string): AstNode {
  const tokenCollection = Tokenization.make().tokenize(inp);
  return AstBuild.buildFor(tokenCollection);
}

Helpers.expose({ Interpreter });
