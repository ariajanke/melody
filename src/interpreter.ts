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
import { AstTupleNode } from './ast_tuple_node';
import { AstFunctionDefinitionNode } from './ast_function_definition_node';
import { LetNameElement } from './let_names_collection';
import { LetNamesCollector } from './let_names_collector';
import { NamingExpressionVisitor } from './naming_expression_visitor';

const { freeze } = Helpers;

const LetVisitor = (() => {
  function make(): AstNodeVisitor<LetNamesCollector> {
    const inst = freeze({
      visitFunctionCall(callNode: AstFunctionCallNode, receiver: AstNode, fArgs: AstTupleNode) {
        // receiver('s name) is being named by fArgs
        const res = receiver.visit(NamingExpressionVisitor.make());
        if (!res.names()) {
          throw new Error(res.error().message);
        }
        const names = [...res.names() as Readonly<string[]>];
        return LetNamesCollector.make(names, callNode.name, fArgs);
      },
      visitLetDeclaration: (_0: AstLetDeclarationNode, _1: AstNode) =>
        LetNamesCollector.makeErroneous('no nested lets allowed'),
      visitIdentifier: (_0: AstFringeNode) =>
        LetNamesCollector.makeErroneous('missing operator "=" or ":="'),
      visitTuple: (_0: AstTupleNode) => LetNamesCollector.
        makeErroneous('nott supported'), // maybe for function param tuples?
      visitFunctionDefinition: (_0: AstFunctionDefinitionNode, _1: AstNode[]) =>
        LetNamesCollector.makeErroneous('fn def doesn\'t make sense here'),
      visitFringe: (_0: AstFringeNode) =>
        LetNamesCollector.makeErroneous('cannot use literal as a name')
    });
    return inst;
  }

  return freeze({ make });
})();

// on type discovery
// at some point, it is assumed that all types can be figured out
// for now we assume the code is *always* at that point

const InterpreterNodeVisitor = freeze({
  make: (context: ExecutionContext) => {
    const mLetVisitor = LetVisitor.make();
    const mStack = PersistentStack.make<ContextVariable>(ContextVariable.make);

    function mValueOf(node: AstNode): ContextVariable {
      if (node.type() === AstNode.types.functionDefinition) {
        return ContextVariable.make(node as AstFunctionDefinitionNode);
      }
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

    const inst = freeze({
      visitFringe: (_0: AstFringeNode) => {},
      visitFunctionCall: (node: AstFunctionCallNode, receiver: AstNode, fArgs: AstTupleNode) => {
        const { resolve, error } = context.functionTypeOf(node);
        const func = resolve();
        if (!func) {
          const res = context.executionTypeOf(receiver);
          const fvar = context.onContextTypeFor(res.resolve(), () =>
            context.tryGetVariable(node.name));
          if (fvar) {
            inst.callFunctionDefinition( fvar.asNode() );
            return;
          }
          throw new Error(error().message);
        }
        func.pushReceiverStrategy(() => { mPushValueOf(receiver); });
        fArgs.forEach(mPushValueOf);
        const impl = func.builtIn();
        if (!impl) {
          throw new Error(`Unimplementedd "${node.name}" function`);
        }
        impl(mStack);
      },
      visitLetDeclaration: (_node: AstLetDeclarationNode, lhs: AstNode) => {
        const collector = lhs.visit(mLetVisitor);
        const collection = collector.setType(context).finish();
        collection.elements()?.forEach((element: LetNameElement) => {
          if (!element.node) { 
            throw new Error('???');
          }
          context.declareVariable(element);
        });
        if (!collection.elements()) {
          throw new Error(collection.error().message);
        }
        
        lhs.visit(inst);
      },
      // see a tuple node, just visit it, which in turn evaluate it?
      visitTuple: (node: AstTupleNode) => {
        node.forEach((node: AstNode) => node.visit(inst));
      },
      visitFunctionDefinition: (_0: AstFunctionDefinitionNode, _1: AstNode[]) => {
      },
      visitIdentifier: (_0: AstFringeNode) => {},
      callFunctionDefinition: (() => {
        const topVisitor = AstNodeVisitorBuilder.
          makeDefaultingToStop().
          visitFunctionDefinition((_0: AstFunctionDefinitionNode, lineNodes: AstNode[]) => {
            lineNodes.forEach((node: AstNode) => {
              node.visit(inst);
            });
          }).
          finish();
        return (node: AstFunctionDefinitionNode) =>
          node.visit(topVisitor);
      })()
    });
    return inst satisfies AstNodeVisitor;
  }
});

export interface Interpreter {
  interpret: (node: AstNode) => void
};

export const Interpreter = freeze({
  make:
    (context: ExecutionContext = ExecutionContext.make()):
    Interpreter =>
  {
    const mVisitor = InterpreterNodeVisitor.make(context);
    
    function interpret(node: AstNode) {
      if (node.type() !== AstNode.types.functionDefinition) { 
        throw new Error('node must be a function defintion');
      }
      mVisitor.callFunctionDefinition(node as AstFunctionDefinitionNode);
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
