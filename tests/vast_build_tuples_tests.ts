import { VastBuild } from '../src/vast_build';
import { CallingContext } from '../src/function_type';
import { MemoryArray } from '../src/memory_array';
import { InterpretedCodeWriter } from '../src/interpreted_code_writer';
import { AstIdentifierNode } from '../src/vast_build/ast_identifier_node';
import { AstIntegerLiteralNode } from '../src/vast_build/ast_integer_literal_node';
import { AstLetDeclarationNode } from '../src/vast_build/ast_let_declaration_node';
import { AstFunctionCallNode } from '../src/vast_build/ast_function_call_node';
import { AstFunctionDefinitionNode } from '../src/vast_build/ast_function_definition_node';
import { Helpers } from '../src/helpers';
import { AstNode } from '../src/vast_build/ast_node';
import { AstTupleNode } from '../src/vast_build/ast_tuple_node';
import { PersistentStack } from '../src/persistent_stack';

// What am I trying to accomplish?
// That the valid Validated ASTs are created

const { presenceAsserted, freeze } = Helpers;

describe('VastBuild Tuples', () => {
  const { makeStringPoolFrom } = VastBuild;

  describe('process-time constants', () => {
    function makeThrowHappyMemoryArray() {
      return freeze({
        load(_0: number) {
          throw new Error('must never load');
        },
        store(slot: number, val: number) {
          if (slot === MemoryArray.stackPointerLocation() && val === 4) {
            return;
          }
          throw new Error('must never store');
        }
      });
    }
    function setupWithThrowHappyMemory(root: AstNode) {
      const stringPool = makeStringPoolFrom(root);
      const memory = makeThrowHappyMemoryArray();
      const build = VastBuild.make(root, stringPool);
      return freeze({
        codeWriter: InterpretedCodeWriter.
          make(stringPool, {
            ...InterpretedCodeWriter.defaultInjections(),
            makeMemory: () => memory,
          }),
        vastRoot: presenceAsserted(build.root)
      });
    }

    function asFunctionDefinition(getNode: () => AstNode) {
      const node = getNode();
      if (AstFunctionDefinitionNode.hasCreated(node)) {
        return node;
      }
      return AstFunctionDefinitionNode.make([getNode()]);
    }

    function validPutsNotWritingToMemoryExamples(getNode: () => AstNode) {
      it('is valid', () => {
        const root = asFunctionDefinition(getNode);
        const build = VastBuild.make(root, makeStringPoolFrom(root));
        expect(build.root()).toBeDefined();
      });

      it('does not write to memory', () => {
        const root = asFunctionDefinition(getNode);
        const { vastRoot, codeWriter } = setupWithThrowHappyMemory(root);
        expect(() => {
          vastRoot().functionType().builtIn()(CallingContext.canTakeAll(), codeWriter);
        }).not.toThrowError();
      });
    }
    function asDefinitionReturnsExpectedValues(getNode: () => AstNode, values: number[]) {
      it(`returns values ${values.join(', ')}`, () => {
        const root = asFunctionDefinition(getNode);
        const stringPool = makeStringPoolFrom(root);
        const stack = PersistentStack.make<number>(() => Infinity);
        const build = VastBuild.make(root, stringPool);
        
        const codeWriter = InterpretedCodeWriter.
            make(stringPool, {
              ...InterpretedCodeWriter.defaultInjections(),
              makeStack: () => stack
            });
        const vastRoot = presenceAsserted(build.root);
        vastRoot().functionType().
          builtIn()(CallingContext.canTakeAll(), codeWriter);
        const arr: number[] = [];
        while (!stack.isEmpty()) {
          arr.push(stack.pop());
        }
        expect(values).toEqual(arr);
      });
    }

    describe('for one-to-one', () => {
      const aLet = () => AstLetDeclarationNode.
        make(AstFunctionCallNode.
          make(AstIdentifierNode.make('a'),
               AstIdentifierNode.make('='),
               AstIntegerLiteralNode.make('3')));
      validPutsNotWritingToMemoryExamples(aLet);
      asDefinitionReturnsExpectedValues(aLet, [3]);
    });

    describe('for one-to-many', () => {
      // let a = (1, 5)
      const tuple = () => AstLetDeclarationNode.
        make(AstFunctionCallNode.
          make(AstIdentifierNode.make('a'),
               AstIdentifierNode.make('='),
               AstTupleNode.make(',', [
                 AstIntegerLiteralNode.make('1'),
                 AstIntegerLiteralNode.make('5'),
               ])));
      validPutsNotWritingToMemoryExamples(tuple);
      asDefinitionReturnsExpectedValues(tuple, [1, 5]);
    });

    describe('for many-to-one', () => {
      // let a = (1, 5)
      // let (b, c) = a
      const firstTuple = () => AstLetDeclarationNode.
        make(AstFunctionCallNode.
          make(AstIdentifierNode.make('a'),
               AstIdentifierNode.make('='),
               AstTupleNode.make(',', [
                 AstIntegerLiteralNode.make('1'),
                 AstIntegerLiteralNode.make('5'),
               ])));
      const secondTuple = () => AstLetDeclarationNode.
        make(AstFunctionCallNode.
              make(AstTupleNode.make(',', [
                AstIdentifierNode.make('b'),
                AstIdentifierNode.make('c'),
              ]),
              AstIdentifierNode.make('='),
              AstIdentifierNode.make('a')));
      const def = () => AstFunctionDefinitionNode.
        make([ firstTuple(), secondTuple() ]);
      validPutsNotWritingToMemoryExamples(def);
      asDefinitionReturnsExpectedValues(def, [1, 5]);
    });

    // TODO I want to test function calls where receiver is a tuple
    describe('for many-to-many', () => {
      // let (a, b) = (1, 2)
      const tuple = () => AstLetDeclarationNode.
        make(AstFunctionCallNode.
          make(AstTupleNode.make(',', [
                AstIdentifierNode.make('a'),
                AstIdentifierNode.make('b'),
              ]),
              AstIdentifierNode.make('='),
              AstTupleNode.make(',', [
                AstIntegerLiteralNode.make('1'),
                AstIntegerLiteralNode.make('2'),
              ])));
      validPutsNotWritingToMemoryExamples(tuple);
      asDefinitionReturnsExpectedValues(tuple, [1, 2]);
    });

    describe('for functions', () => {
      const fooDef = () => AstLetDeclarationNode.
        make(AstFunctionCallNode.
          make(AstIdentifierNode.make('foo'),
               AstIdentifierNode.make('='),
               AstFunctionDefinitionNode.make([])));
      const fooCall = () => AstFunctionCallNode.
        makeWithContextReceiver(AstIdentifierNode.make('foo'), AstTupleNode.make(',', []));
      it('is valid', () => {
        const root = AstFunctionDefinitionNode.make([fooDef(), fooCall()]);
        const build = VastBuild.make(root, makeStringPoolFrom(root));
        expect(build.root()).toBeDefined();
      });

      it('does not write to memory', () => {
        const root = AstFunctionDefinitionNode.make([fooDef(), fooCall()]);
        const { vastRoot, codeWriter } = setupWithThrowHappyMemory(root);
        expect(() => {
          vastRoot().functionType().builtIn()(CallingContext.canTakeAll(), codeWriter);
        }).not.toThrowError();
      });
    });
  });
});