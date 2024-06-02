import { AstBuild } from './ast_build';
import { AstNodeVisitor, AstNode, AstEvaluatableNode } from './ast_node';
import { Tokenization } from './tokenization';
import { AstFunctionCallNode } from './ast_function_call_node';
import { Helpers, PersistentStack } from './helpers';
import { AstLetDeclarationNode } from './ast_let_declaration_node';
import { ContextVariable } from './context_variable';
import { ExecutionContext } from './execution_context';
import { AstFringeNode } from './ast_fringe_node';

const { freeze } = Object;

export interface Interpreter extends AstNodeVisitor {

};

export const Interpreter = freeze({ make, buildFor });

const LetVisitor = (() => {
  function make(context: ExecutionContext): AstNodeVisitor {
    const inst = freeze({
      visitFunctionCall: (_0: AstFunctionCallNode): void => {},
      visitLetDeclaration: (_0: AstLetDeclarationNode): void => {},
      visitBinaryOperation:
        (_0: string, lhs: AstNode, rhs: AstNode): void => {
          const lhsName = AstFringeNode.downcast(lhs).asString();
          context.declareVariable(lhsName).
                  setType(rhs.executionType(context));
          // STOP HERE
        },
      visitIdentifier: (_0: AstFringeNode) => {

      }
    });
    return inst;
  }

  return freeze({ make });
})();

const injections = freeze({ putsFunction: console.log });

function make
  (context: ExecutionContext = ExecutionContext.make(),
   { putsFunction } = injections):
  Interpreter
{
  const mStack = PersistentStack.make<ContextVariable>(ContextVariable.make);
  const mLetVisitor = LetVisitor.make(context);
  const inst = freeze({
    visitFunctionCall, visitLetDeclaration, visitBinaryOperation, visitIdentifier
  });
  function visitFunctionCall(node: AstFunctionCallNode) {
    if (node.name === 'puts') {
      node.arguments.forEach((node: AstNode) => {
        const cv = valueOf(node);
        putsFunction(cv.asString());
      });
    }
  }

  function visitLetDeclaration(dec: AstLetDeclarationNode, lhs: AstNode) {
    // can't catch this, oof
    // if (lhs.type() !== AstNode.types.assignment) {
    //   throw Error('bad let');
    // }
    // mGetVarFunc = context.declareVariable;
    lhs.visit(mLetVisitor);
    lhs.visit(inst);
    // mGetVarFunc = context.getVariable;
  }

  function valueOf(node: AstNode): ContextVariable {
    const evalNode = AstEvaluatableNode.tryDowncast(node);
    if (evalNode) {
      return evalNode.evaluate(context.getVariable);
    }
    return mStack.pop();
  }

  function visitBinaryOperation(op: string, lhs: AstNode, rhs: AstNode) {
    // resolve lhs's type
    // select operator function
    // raise if rhs's resolved type is incompatible
    // how does this work in the general recursive case?
    //
    // this ends up having to be executed DFS style
    // there will be places that *have to* be executed BFS style
    // context.
    lhs.visit(inst);
    rhs.visit(inst);
    const func = lhs.executionType(context).lookUp(op);
    const rhsAsParam = rhs.executionType(context).asSingluarParameter();
    const deg = func.satisfactionDegreeOfArguments(rhsAsParam);
    if (typeof deg === 'undefined') {
      throw Error('');
    }
    const builtIn = func.builtIn();
    if (typeof builtIn === 'undefined') {
      throw Error('');
    }
    const lhsVal = valueOf(lhs);
    const rhsVal = valueOf(rhs);
    builtIn(mStack, lhsVal, rhsVal);
  }

  function visitIdentifier(_0: AstFringeNode) {

  }

  return inst;
}

function buildFor(inp: string): AstNode {
  const tokenCollection = Tokenization.make().tokenize(inp);
  return AstBuild.buildFor(tokenCollection);
}

Helpers.expose({ Interpreter });
