import { TestHelpers } from './test_helpers';
import { VastBuild } from '../src/vast_build';
import { AstStringLiteralNode } from '../src/ast_string_literal_node';
import { StringPool } from '../src/string_pool';
import { StringType } from '../src/string_type';
import { BuiltInFunction, CallingContext } from '../src/function_type';
import { AstIdentifierNode } from '../src/ast_identifier_node';
import { AstIntegerLiteralNode } from '../src/ast_integer_literal_node';
import { AstFunctionCallNode } from '../src/ast_function_call_node';
import { MemoryArray } from '../src/memory_array';
import { PersistentStack } from '../src/persistent_stack';
import { AstFunctionDefinitionNode } from '../src/ast_function_definition_node';
import { AstLetDeclarationNode } from '../src/ast_let_declaration_node';
import { InterpretedCodeWriter } from '../src/interpreted_code_writer';
import { ObjectType } from '../src/object_type';

// What am I trying to accomplish?
// That the valid Validated ASTs are created

const { describeNamed } = TestHelpers;

describeNamed({ VastBuild }, () => {

  describe('string literals', () => {
    function makeBuild() {
      const astNode = AstStringLiteralNode.make('cat');
      return VastBuild.make(astNode, StringPool.make(astNode));
    }
    it('builds a valid node', () => {
      const build = makeBuild();
      expect(build.root()).toBeDefined();
    });

    it('is the expected function type', () => {
      const build = makeBuild();
      const root = build.root();
      if (!root)
        { return fail(); }
      const params = root.functionType().parameters();
      const rets = root.functionType().returns();
      expect(params.uid()).toEqual(ObjectType.emptyTupleInstance().uid());
      expect(rets.uid()).toEqual(StringType.instance().uid());
    });
  });

  describe('function definition node', () => {
    function makeBuild(varNames: string[], codeWriterInjections = InterpretedCodeWriter.defaultInjections()) {
      function mkAssignFor(node: AstIdentifierNode) {
        
        const intNode = AstIntegerLiteralNode.make('3');
        const assign = AstIdentifierNode.make(':=');
        return AstLetDeclarationNode.make(AstFunctionCallNode.make(node, assign, intNode));
      }
      const def = AstFunctionDefinitionNode.
        make(varNames.map((name: string) => mkAssignFor(AstIdentifierNode.make(name))));
      const stringPool = StringPool.makeDefault();
      
      return {
        build: VastBuild.make(def, stringPool),
        codeWriter: InterpretedCodeWriter.make( stringPool, codeWriterInjections )
      };
    }

    describe('for one line', () => {
      it('builds a valid node', () => {
        expect(makeBuild(['a']).build.root()).toBeDefined();
      });

      it('composes it\'s line into a single function', () => {
        const memory = MemoryArray.make();
        const stack = PersistentStack.make<number>(() => Infinity);
        const { build, codeWriter } = makeBuild(['a'], {
          ...InterpretedCodeWriter.defaultInjections(),
          makeMemory: () => memory,
          makeStack: () => stack
        });
        const root = build.root();
        if (!root)
          { throw new Error(build.errors()[0].message); }
        memory.store(MemoryArray.stackPointerLocation(), 1);
        root.functionType().onBuiltIn((impl: BuiltInFunction) => {
          impl(CallingContext.canTakeAll(), codeWriter);
        });
        expect(memory.load(1)).toEqual(3);
        expect(stack.count()).toEqual(1);
        expect(stack.pop()).toEqual(3);
      });
    });

    describe('for two lines', () => {
      it('builds a valid node', () => {
        expect(makeBuild(['a', 'b']).build.root()).toBeDefined();
      });

      it('composes it\'s (two) lines into a single function', () => {
        const memory = MemoryArray.make();
        const stack = PersistentStack.make<number>(() => Infinity);
        const { build, codeWriter } = makeBuild(['a', 'b'], {
          ...InterpretedCodeWriter.defaultInjections(),
          makeMemory: () => memory,
          makeStack: () => stack
        });
        const root = build.root();
        if (!root)
          { throw new Error(build.errors()[0].message); }
        memory.store(MemoryArray.stackPointerLocation(), 1);
        root.functionType().onBuiltIn((impl: BuiltInFunction) => {
          impl(CallingContext.canTakeAll(), codeWriter);
        });
        expect(memory.load(1)).toEqual(3);
        expect(memory.load(2)).toEqual(3);
        expect(stack.count()).toEqual(1);
        expect(stack.pop()).toEqual(3);
      });
    });
  });
});
