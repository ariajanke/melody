import { AstBuild } from './ast_build';
import { AstNodeVisitor, AstNode } from './ast_node';
import { AstStringableNode } from './ast_stringable_node';
import { Tokenization } from './tokenization';
import { AstFunctionCallNode } from './ast_function_call_node';
// import { AstAssignmentNode } from './ast_assignment_node';
import { AstBinaryOperatorNode } from './ast_binary_operator_node';
import { Helpers, PersistentStack } from './helpers';
import { AstLetDeclarationNode } from './ast_let_declaration_node';
import { ContextVariable } from './context_variable';
import { ExecutionContext } from './execution_context';
import { ObjectLookUpTable } from './type_system';

const { freeze } = Object;

export interface Interpreter extends AstNodeVisitor {

};

const LetVisitor = (() => {
  function make(context: ExecutionContext): AstNodeVisitor {
    let mAssigneeNameFn = (): string => {
      throw Error('must assign assignee name fn');
    };

    function setAssigneeName(fn: () => string) {
      mAssigneeNameFn = fn;
    }

    function visitFunctionCall(_0: AstFunctionCallNode) {
      throw Error('');
    }

    // function visitAssignment(_0: AstAssignmentNode, lhs: AstNode) {
    //   context.declareVariable(mAssigneeNameFn(), AstStringableNode.downcast(lhs).asString());
    // }

    function visitBinaryOperation(op: string, lhs: AstNode, rhs: AstNode) {

    }

    function visitLetDeclaration(_0: AstLetDeclarationNode, _1: AstNode) {
      throw Error('');
    }

    return freeze({
      setAssigneeName,
      visitFunctionCall,
      visitBinaryOperation,
      visitLetDeclaration
    });
  }
  return freeze({ make });
})();

export const Interpreter = freeze({ make, buildFor });

const injections = freeze({ putsFunction: console.log });

function make
  (context: ExecutionContext = ExecutionContext.make(),
   
   { putsFunction } = injections):
  Interpreter
{
  const nodeTypes = AstNode.types;
  const mLetVisitor = LetVisitor.make(context);
  
  const mStack = PersistentStack.make<ContextVariable>(ContextVariable.make);
  const mObjectLookupTable = ObjectLookUpTable.make().addBuiltinTypes();
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
    // const assignmentNode = (lhs as AstAssignmentNode);
    // mLetVisitor.setAssigneeName(assignmentNode.assigneeName);
    // assignmentNode.visit(mLetVisitor);
  }

  // function visitAssignment(node: AstAssignmentNode, rhs: AstNode) {
  //   context.setVariable(node.assigneeName(), getValueOf(rhs as AstStringableNode));
  // }

  function visitBinaryOperation(op: string, lhs: AstNode, rhs: AstNode) {
    // resolve lhs's type
    // select operator function
    // raise if rhs's resolved type is incompatible
    // how does this work in the general recursive case?
    //
    // this ends up having to be executed DFS style
    // there will be places that *have to* be executed BFS style
    lhs.executionType(mObjectLookupTable);
  }

  return freeze({ visitFunctionCall, visitLetDeclaration, visitBinaryOperation });
}

function buildFor(inp: string): AstNode {
  const tokenCollection = Tokenization.make().tokenize(inp);
  return AstBuild.buildFor(tokenCollection);
}

Helpers.expose({ Interpreter });
