import { AstBuild } from './ast_build';
import { AstNode } from './ast_node';
import { Tokenization } from './tokenization';
import { AstFunctionCallNode } from './ast_function_call_node';
import { Helpers } from './helpers';
import { AstLetDeclarationNode } from './ast_let_declaration_node';
import { ContextVariable } from './context_variable';
import { ExecutionContext } from './execution_context';
import { PersistentStack } from './persistent_stack';
import { AstNodeVisitor, AstNodeVisitorBuilder } from './ast_node_visitor';
import { AstTupleNode } from './ast_tuple_node';
import { AstFunctionDefinitionNode } from './ast_function_definition_node';
import { LetNameElement } from './let_names_collection';
import { LetNamesCollector } from './let_names_collector';
import { NamingExpressionVisitor } from './naming_expression_visitor';
import { BuiltInFunction, FunctionType } from './function_type';
import { AstIdentifierNode } from './ast_identifier_node';
import { AstLiteralNode } from './ast_fringe_node';
import { MemoryArray } from './memory_array';
import { ContextType, StringPool } from './context_type';
import { FunctionTypeRetrieval } from './function_type_retrieval';

const { freeze, memoize } = Helpers;

export const LetVisitor = (() => {
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
      visitIdentifier: (_0: AstIdentifierNode) =>
        LetNamesCollector.makeErroneous('missing operator "=" or ":="'),
      visitTuple: (_0: AstTupleNode) => LetNamesCollector.
        makeErroneous('nott supported'), // maybe for function param tuples?
      visitFunctionDefinition: (_0: AstFunctionDefinitionNode, _1: AstNode[]) =>
        LetNamesCollector.makeErroneous('fn def doesn\'t make sense here'),
      visitLiteral: (_0: AstLiteralNode) =>
        LetNamesCollector.makeErroneous('cannot use literal as a name')
    });
    return inst;
  }

  return freeze({ make });
})();

const InterpreterNodeVisitor = freeze({
  make: (context: ExecutionContext, injections = Interpreter.defaultInjections()) => {
    const mLetVisitor = LetVisitor.make();
    const mStack = injections.makeStack();
    const mMemory = injections.makeMemory();
    const mFunctionRetrieval = FunctionTypeRetrieval.make();
    const { stackPointerLocation } = MemoryArray;
    mMemory.load(stackPointerLocation()).set(stackPointerLocation() + 1);

    function runFunction(funcType: FunctionType) {
      funcType.
        onBuiltIn((impl: BuiltInFunction) => {
          impl(mStack, mMemory);
        }).
        onNodeImplementation((node: AstFunctionDefinitionNode) => {
          inst.callFunctionDefinition(node);
        });
    }

    const inst = freeze({
      visitLiteral(node: AstLiteralNode) {
        node.value().copyTo( mStack.push() );
      },
      visitFunctionCall: (node: AstFunctionCallNode, receiver: AstNode, fArgs: AstTupleNode) => {
        const func = mFunctionRetrieval.
          reset(node, receiver, fArgs, context).
          retrievedType();
        if (!func) {
          throw new Error(mFunctionRetrieval.error().message);
        }

        func.withCallStrategy().chooseReceiver(() => {
          receiver.visit(inst);
        });

        fArgs.forEach((node: AstNode) => node.visit(inst));
        // <- receiver things here (get/set cvar)
        runFunction(func);
      },
      visitLetDeclaration: (_node: AstLetDeclarationNode, lhs: AstNode) => {
        const collector = lhs.visit(mLetVisitor);
        const collection = collector.setType(context).finish();
        collection.elements()?.forEach((element: LetNameElement) => {
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
      visitFunctionDefinition(fnDefNode: AstFunctionDefinitionNode, _1: AstNode[]) {
        mStack.push().set(fnDefNode);
      },
      visitIdentifier(node: AstIdentifierNode) {
        // still get here with let definitions
        // so still need a "noReceiver", until an alternative solution is found
        const func = context.
          lookUpOnContextType(node.contextMethodName()).
          byParameters([]) ??
          (() => {
            throw new Error(`Cannot look up reader method for "${node.asString()}"`);
          })();
        runFunction(func);
      },
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
  defaultInjections: memoize(() => freeze({
    makeMemory: MemoryArray.make,
    makeStack : () => PersistentStack.make<ContextVariable>(ContextVariable.make),
    makeContext: (getStringPool: () => StringPool) =>
      ExecutionContext.make(ContextType.make({
        ...ContextType.defaultInjections(), getStringPool
      }))
  })),
  make: (injections = Interpreter.defaultInjections()):
    Interpreter =>
  {
    
    
    function interpret(node: AstNode) {
      if (!AstFunctionDefinitionNode.hasCreated( node )) {
        throw new Error('node must be a function defintion');
      }
      
      const context = injections.makeContext(() => StringPool.make(node));
      const mVisitor = InterpreterNodeVisitor.make(context, injections);
      
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
