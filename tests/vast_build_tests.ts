import { TestHelpers } from './test_helpers';
import { VastBuild } from '../src/vast_build';
import { StringPool } from '../src/string_pool';
import { StringType } from '../src/string_type';
import { BuiltInFunction, CallingContext } from '../src/function_type';
import { MemoryArray } from '../src/memory_array';
import { PersistentStack } from '../src/persistent_stack';
import { InterpretedCodeWriter } from '../src/interpreted_code_writer';
import { ObjectType } from '../src/object_type';
import { AstStringLiteralNode } from '../src/vast_build/ast_string_literal_node';
import { AstIdentifierNode } from '../src/vast_build/ast_identifier_node';
import { AstIntegerLiteralNode } from '../src/vast_build/ast_integer_literal_node';
import { AstLetDeclarationNode } from '../src/vast_build/ast_let_declaration_node';
import { AstFunctionCallNode } from '../src/vast_build/ast_function_call_node';
import { AstFunctionDefinitionNode } from '../src/vast_build/ast_function_definition_node';

// What am I trying to accomplish?
// That the valid Validated ASTs are created

const { describeNamed } = TestHelpers;

describeNamed({ VastBuild }, () => {
  const { makeStringPoolFrom } = VastBuild;
  function sampleFunctionDef() {
    const foo = AstIdentifierNode.make('foo');
    const def = AstFunctionDefinitionNode.make( [AstStringLiteralNode.make('cat')] );
    const call = AstFunctionCallNode.make(foo, AstIdentifierNode.make(':='), def);
    return AstLetDeclarationNode.make(call);
  }

  describe('string literals', () => {
    function makeBuild() {
      const astNode = AstStringLiteralNode.make('cat');
      return VastBuild.make(astNode, makeStringPoolFrom(astNode));
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
        memory.store(MemoryArray.stackPointerLocation(), 4);
        root.functionType().onBuiltIn((impl: BuiltInFunction) => {
          impl(CallingContext.canTakeAll(), codeWriter);
        });
        expect(memory.load(4)).toEqual(3);
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
        memory.store(MemoryArray.stackPointerLocation(), 4);
        root.functionType().onBuiltIn((impl: BuiltInFunction) => {
          impl(CallingContext.canTakeAll(), codeWriter);
        });
        expect(memory.load(4)).toEqual(3);
        expect(memory.load(8)).toEqual(3);
        expect(stack.count()).toEqual(1);
        expect(stack.pop()).toEqual(3);
      });
    });
  });

  describe('defining a function with a let', () => {
    // let foo := fn 'cat'
    it('is a valid declaration', () => {
      const letStt = sampleFunctionDef();
      const build = VastBuild.
        make(AstFunctionDefinitionNode.make([letStt]),
             makeStringPoolFrom(letStt));
      const root = build.root();
      if (!root) {
        throw new Error(build.errors()[0].message);
      }
      expect(root.functionType().parameters().uid()).
        toEqual(ObjectType.emptyTupleInstance().uid());
    });
  });

  describe('defining a function that attempts a capture', () => {
    it('fails (for now)', () => {
      const bvar = AstIdentifierNode.make('b');
      const putsB = AstFunctionCallNode.
        makeWithContextReceiver(AstIdentifierNode.make('puts'), bvar);
      const blet = AstLetDeclarationNode.make(AstFunctionCallNode.
        make(bvar, AstIdentifierNode.make(':='), AstIntegerLiteralNode.make('1')));
      const defNode = AstFunctionDefinitionNode.make([putsB]);
      const astRoot = AstFunctionDefinitionNode.make([blet, defNode]);
      const build = VastBuild.make(astRoot, makeStringPoolFrom(astRoot));
      if (build.root()) {
        throw new Error('ought to not be valid');
      }
      expect(build.errors()[0].message).toEqual('"b" is not declared');
    });
  });
});
