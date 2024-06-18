import { AstBuild } from './ast_build';
import { AstNode, AstEvaluatableNode } from './ast_node';
import { Tokenization } from './tokenization';
import { AstFunctionCallNode } from './ast_function_call_node';
import { Helpers } from './helpers';
import { AstLetDeclarationNode } from './ast_let_declaration_node';
import { ContextVariable } from './context_variable';
import { ExecutionContext } from './execution_context';
import { AstFringeNode } from './ast_fringe_node';
import { PersistentStack } from './persistent_stack';
import { AstNodeVisitor, AstNodeVisitorBuilder } from './ast_node_visitor';
import { AstBinaryOperatorNode } from './ast_binary_operator_node';

const { freeze } = Object;

const LetVisitor = (() => {
  function make(context: ExecutionContext): AstNodeVisitor {
    const inst = 
      AstNodeVisitorBuilder.
      makeDefaultingToStop().
      visitBinaryOperation((node: AstBinaryOperatorNode, lhs: AstNode, rhs: AstNode): void => {
        const lhsName = AstFringeNode.downcast(lhs).asString();
        const rhsRes = rhs.executionType(context);
        const rhsType = rhsRes.resolve();
        if (!rhsType) {
          throw Error(`Cannot figure out type of function call "${node.operation()}"`);
        }
        context.declareVariable(lhsName).setType(rhsType);
        // STOP HERE
      }).
      finish();
    return inst;
  }

  return freeze({ make });
})();

const injections = freeze({
  putsFunction: console.log,
  // not a blocker, just need to use a stack
  askStringFunction: (resume: (gotten: string) => void) => {
    new Promise<string>((resolve: (value: string) => void) => {
      const answer = (inp: string) => resolve(inp);
      Helpers.expose({ answer });
    }).then((gotten: string) => {
      resume(gotten);
    });
  }
});

export interface Interpreter extends AstNodeVisitor {

};

// Can't use async *script here
// if you can't do it in Melody, you can't do it here
// (until way up on the call stack)

export const Interpreter = freeze({
  make:
    (context: ExecutionContext = ExecutionContext.make(),
    { putsFunction, askStringFunction } = injections):
    Interpreter =>
  {
    const mStack = PersistentStack.make<ContextVariable>(ContextVariable.make);
    const mLetVisitor = LetVisitor.make(context);

    function mValueOf(node: AstNode): ContextVariable {
      const evalNode = AstEvaluatableNode.tryDowncast(node);
      if (evalNode) {
        return evalNode.evaluate(context.getVariable);
      }
      return mStack.pop();
    }

    const kBuiltinFunctions = freeze({
      puts: (node: AstFunctionCallNode): void => {
        node.arguments.forEach((node: AstNode) => {
          const cv = mValueOf(node);
          putsFunction(cv.asString());
        });
      },
      askString: (_0: AstFunctionCallNode): void => {
        askStringFunction((gotten: string) => {
          mStack.push().set(gotten);
        });
      }
    });

    const inst = AstNodeVisitorBuilder.
      makeDefaultingToContinue().
      visitFunctionCall((node: AstFunctionCallNode) => {
        const fn = kBuiltinFunctions[node.name];
        if (!fn) {
          throw Error(`unimplemented function "${node.name}"`);
        }
        fn(node);
      }).
      visitLetDeclaration((_0: AstLetDeclarationNode, lhs: AstNode) => {
        lhs.visit(mLetVisitor);
        lhs.visit(inst);
      }).
      visitBinaryOperation((node: AstBinaryOperatorNode, lhs: AstNode, rhs: AstNode) => {
        // resolving value... far touch much logic lives here
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
        const op = node.operation();
        const func = lhs.executionType(context).resolve()?.lookUp(op);
        if (!func) {
          throw Error(`Cannot look up function "${op}"`);
        }

        const rhsAsParam = rhs.executionType(context).resolve()?.asSingluarParameter();
        if (!rhsAsParam) {
          throw Error(`Cannot look up rhs type`);
        }
        const deg = func.satisfactionDegreeOfArguments(rhsAsParam);
        if (typeof deg === 'undefined') {
          throw Error('');
        }
        const builtIn = func.builtIn();
        if (typeof builtIn === 'undefined') {
          throw Error('');
        }
        const lhsVal = mValueOf(lhs);
        const rhsVal = mValueOf(rhs);
        builtIn(mStack, lhsVal, rhsVal);
      }).
      finish();

    return inst;
  },

  buildFor: (inp: string): AstNode => {
    const tokenRange = Tokenization.make().tokenize(inp);
    return AstBuild.buildFor(tokenRange);
  },

  buildAndRun: (inp: string): void => {
    const tokenRange = Tokenization.make().tokenize(inp);
    const astBuild = AstBuild.make(tokenRange);
    const root = astBuild.build();
    if (!root) {
      console.log('cannot build program');
      astBuild.errors().forEach(({ message } : { message: string }) => {
        console.log(message);
      });
      return;
    }
    root.visit(Interpreter.make());
  }
});

Helpers.expose({ Interpreter });
