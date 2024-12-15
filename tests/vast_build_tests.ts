import { TestHelpers } from './test_helpers';
import { VastBuild } from '../src/vast_build';
import { AstStringLiteralNode } from '../src/ast_string_literal_node';
import { StringPool } from '../src/context_type';
import { StringType } from '../src/string_type';
import { BuiltInFunction } from '../src/function_type';
import { AstIdentifierNode } from '../src/ast_identifier_node';
import { AstIntegerLiteralNode } from '../src/ast_integer_literal_node';
import { AstFunctionCallNode } from '../src/ast_function_call_node';
import { MemoryArray } from '../src/memory_array';
import { PersistentStack } from '../src/persistent_stack';
import { AstFunctionDefinitionNode } from '../src/ast_function_definition_node';
import { AstLetDeclarationNode } from '../src/ast_let_declaration_node';

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
      expect(params).toEqual([]);
      expect(rets[0].uid()).toEqual(StringType.instance().uid());
    });
  });

  // describe('integer literals', () => {
  //   it('builds a valid node', () => {

  //   });

  //   it('is the expected function type', () => {

  //   });
  // });

  // describe('directly defined identifier node', () => {
  //   it('is it\'s return type(s)', () => {

  //   });
  // });

  // describe('context defined indentifier node', () => {
  //   it('builds a valid node', () => {

  //   });

  //   it('is the expected object type', () => {

  //   });
  // });

  describe('function definition node', () => {
    function makeBuild() {
      function mkAssignFor(node: AstIdentifierNode) {
        
        const intNode = AstIntegerLiteralNode.make('3');
        const assign = AstIdentifierNode.make(':=');
        return AstLetDeclarationNode.make(AstFunctionCallNode.make(node, assign, intNode));
      }
      const def = AstFunctionDefinitionNode.
        make(['a', 'b'].
              map((name: string) => mkAssignFor(AstIdentifierNode.make(name))));
      return VastBuild.make(def, StringPool.makeDefault());
    }
    
    
    it('builds a valid node', () => {
      expect(makeBuild().root()).toBeDefined();
    });

    it('composes it\'s (two) lines into a single function', () => {
      const memory = MemoryArray.make();
      const stack = PersistentStack.make<number>(() => Infinity);
      const build = makeBuild();
      const root = build.root();
      if (!root)
        { throw new Error(build.errors()[0].message); }
      memory.store(MemoryArray.stackPointerLocation(), 1);
      root.functionType().onBuiltIn((impl: BuiltInFunction) => {
        impl(stack, memory);
      });
      expect(memory.load(1)).toEqual(3);
      expect(memory.load(2)).toEqual(3);
      expect(stack.count()).toEqual(2);
      expect(stack.pop()).toEqual(3);
      expect(stack.pop()).toEqual(3);
    });
  });

  // describe('tuple node', () => {

  // });

  // describe('function call node', () => {

  // });
});
