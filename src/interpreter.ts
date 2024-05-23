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

const LetVisitor = (() => {
  function make(context: Context) {
    let mAssigneeNameFn = (): string => {
      throw Error('must assign assignee name fn');
    };

    function setAssigneeName(fn: () => string) {
      mAssigneeNameFn = fn;
    }

    function visitFunctionCall(_0: AstFunctionCallNode) {
      throw Error('');
    }

    function visitAssignment(_0: AstAssignmentNode, lhs: AstNode) {
      context.declareVariable(mAssigneeNameFn(), AstStringableNode.downcast(lhs).asString());
    }

    function visitLetDeclaration(_0: AstLetDeclarationNode, _1: AstNode) {
      throw Error('');
    }

    return freeze({
      setAssigneeName,
      visitFunctionCall,
      visitAssignment,
      visitLetDeclaration
    });
  }
  return freeze({ make });
})();

export const Interpreter = freeze({ make, buildFor });

const injections = freeze({ putsFunction: console.log });

function make
  (context: Context = Context.make(), { putsFunction } = injections): 
  Interpreter
{
  const nodeTypes = AstNode.types;
  const mLetVisitor = LetVisitor.make(context);
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

  function visitLetDeclaration(_0: AstLetDeclarationNode, lhs: AstNode) {
    if (lhs.type() !== AstNode.types.assignment) {
      throw Error('bad let');
    }
    const assignmentNode = (lhs as AstAssignmentNode);
    mLetVisitor.setAssigneeName(assignmentNode.assigneeName);
    assignmentNode.visit(mLetVisitor);
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
