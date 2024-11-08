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
import { AstTupleNode } from './ast_tuple_node';
import { ObjectType } from './object_type';
import { AstFunctionDefinitionNode } from './ast_function_definition_node';

const { freeze } = Object;

const NamingVisitor = freeze({
  make(context: ExecutionContext): AstNodeVisitor {
    let mNameDictionary: { [name: string]: ObjectType } = {};
    return AstNodeVisitorBuilder.makeDefaultingToContinue().finish();
  }
});

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
  // just make it random
  askStringFunction: (): string => 'bees'
});

const InterpreterNodeVisitor = freeze({
  make: (context: ExecutionContext,
         { putsFunction, askStringFunction } = injections):
    AstNodeVisitor =>
  {
    const mLetVisitor = LetVisitor.make(context);
    const mStack = PersistentStack.make<ContextVariable>(ContextVariable.make);

    function mValueOf(node: AstNode): ContextVariable {
      const evalNode = AstEvaluatableNode.tryDowncast(node);
      if (evalNode) {
        return evalNode.evaluate(context.getVariable);
      }
      node.visit(inst);
      return mStack.pop();
    }

    function mPushValueOf(node: AstNode): void {
      mStack.push(mValueOf(node));
    }

    const kBuiltinFunctions:
      { [name: string]: (node: AstFunctionCallNode) => void } =
      freeze({
        puts: (node: AstFunctionCallNode): void => {
          node.arguments.forEach((node: AstNode) => {
            const cv = mValueOf(node);
            putsFunction(cv.asString());
          });
        },
        askString: (_0: AstFunctionCallNode): void => {
          mStack.push().set(askStringFunction());
        },
        pass: (node: AstFunctionCallNode): void =>
          node.arguments.forEach(mPushValueOf),
        evaluate: (node: AstFunctionCallNode): void =>
          node.arguments.forEach(mValueOf)
      });

    const inst = freeze({
      visitFunctionCall: (node: AstFunctionCallNode) => {
        const fn = kBuiltinFunctions[node.name];
        if (!fn) {
          throw Error(`unimplemented function "${node.name}"`);
        }
        
        fn(node);
      },
      visitLetDeclaration: (node: AstLetDeclarationNode, lhs: AstNode) => {
        lhs.visit(mLetVisitor);
        
        lhs.visit(inst);
      },
      // see a tuple node, just visit it, which in turn evaluate it?
      visitTuple: (node: AstTupleNode) => {
        node.forEach((node: AstNode) => node.visit(inst));
      },
      visitFunctionDefinition: (_0: AstFunctionDefinitionNode, _1: AstNode[]) => {},
      visitIdentifier: (_0: AstFringeNode) => {},
      visitBinaryOperation: (node: AstBinaryOperatorNode, lhs: AstNode, rhs: AstNode) => {
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
      }
    });
    return inst;
  }
});

export interface Interpreter {
  interpret: (node: AstNode) => void
};

export const Interpreter = freeze({
  make:
    (context: ExecutionContext = ExecutionContext.make(),
    injections_ = injections):
    Interpreter =>
  {
    const mVisitor = InterpreterNodeVisitor.make(context, injections_);
    
    function interpret(node: AstNode) {
      node.visit(mVisitor);
    }

    return freeze({ interpret });
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
    Interpreter.make().interpret(root);
  }
});

Helpers.expose({ Interpreter });
