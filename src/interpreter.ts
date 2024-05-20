import { AstBuild } from './ast_build';
import {
  AstNodeVisitor,
  AstNodeType,
  AstNode,
} from './ast_node';
import { Context } from './context';
import { AstStringableNode } from './ast_stringable_node';
import { Tokenization } from './tokenization';
import { AstFunctionCallNode } from './ast_function_call_node';
import { AstAssignmentNode } from './ast_assignment_node';

const { freeze } = Object;

export interface Interpreter extends AstNodeVisitor {

};

export const Interpreter = freeze({ make, compile });

const injections = freeze({ putsFunction: console.log });

function make(context: Context = Context.make(), { putsFunction } = injections): Interpreter {
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
    case AstNodeType.stringLiteral:
      return val;
    case AstNodeType.identifier:
      return context.getValueOfVariable(val) ?? (() => {
        throw Error(`variable ${val} not declared`);
      })();
    default: break;
    }
    throw Error('impossible branch??');
  }

  function visitLetDeclaration(_0: AstNode) {}

  function visitAssignment(node: AstAssignmentNode, rhs: AstNode) {
    context.setVariable(node.assigneeName(), getValueOf(rhs as AstStringableNode));
  }

  return freeze({ visitFunctionCall, visitLetDeclaration, visitAssignment });
}

function compile(inp: string): AstNode {
  const tokenCollection = Tokenization.make().tokenize(inp);
  return AstBuild.buildFor(tokenCollection);
}

window['Interpreter'] = Interpreter;
