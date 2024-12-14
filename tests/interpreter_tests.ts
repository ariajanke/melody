import { TestHelpers } from './test_helpers';
import { Interpreter } from '../src/interpreter';
import { ExecutionContext } from '../src/execution_context';
import { AstStringLiteralNode } from '../src/ast_string_literal_node';
import { ObjectType } from '../src/object_type';
import { AstTupleNode } from '../src/ast_tuple_node';
import { BuiltInFunction, FunctionType } from '../src/function_type';
import { MemoryArray } from '../src/memory_array';
import { Helpers } from '../src/helpers';
import { ContextType, StringPool } from '../src/context_type';
import { PersistentStack } from '../src/persistent_stack';

const { memoize } = Helpers;
const { describeNamed } = TestHelpers;

describeNamed({ Interpreter }, () => {
  function makePutsFunction() {
    const printedStrings: string[] = [];
    const putsFunction = (str: string) => { printedStrings.push(str); };

    return { putsFunction, printedStrings };
  }

  describe('integration specs', () => {
    it('compiles and runs a "hello world!" program', () => {
      const programRootNode = Interpreter.buildFor("puts('hello', 'there', ' world!')");
      const { printedStrings, putsFunction } = makePutsFunction();
      
      const interpreter = Interpreter.make({
        ...Interpreter.defaultInjections(),
        putsFunction
      });
      interpreter.interpret(programRootNode);
      expect(printedStrings).toEqual(['hello', 'there' ,' world!']);
    });

    it('compiles and runs a "hello world!" program with a variable', () => {
      const programRootNode = Interpreter.buildFor("puts(foo)");
      const { printedStrings, putsFunction } = makePutsFunction();
      const stringPool = StringPool.makeForStrings(() => ['hello world!']);
      const makeStringPool = () => stringPool;
      const contextType = ContextType.
        make( stringPool, { ...ContextType.defaultInjections(), putsFunction } );
      const context = ExecutionContext.make( contextType );
      const fooNode = AstStringLiteralNode.make('foo');
      const memory = MemoryArray.make();
      const stack = PersistentStack.make<number>(() => Infinity);

      const fooType = context.declareVariable({
        name: 'foo',
        type: context.executionTypeOf(fooNode).resolve() as ObjectType,
        operator: ':=',
        node: AstTupleNode.make(',', [fooNode])
      });
      (context.
        lookUpOnContextType('.foo').
        byParameters([fooType]) as FunctionType ).
        onBuiltIn((bif: BuiltInFunction) => {
          stack.push(0); // 'hello world!'
          bif(stack, memory);
        });
      const interpreter = Interpreter.make({
        ...Interpreter.defaultInjections(),
        makeMemory : () => memory,
        makeStack  : () => stack,
        makeContextType: () => contextType,
        makeContext: () => context,
        putsFunction,
        makeStringPool
      });

      interpreter.interpret(programRootNode);
      expect(printedStrings).toEqual(['hello world!']);
    });

    it('compiles and runs a multiline "hello world!" program', () => {
      const programRootNode = Interpreter.
      buildFor("puts('hello')\nputs('world!')");
      const { printedStrings, putsFunction } = makePutsFunction();
      const interpreter = Interpreter.
        make({ ...Interpreter.defaultInjections(), putsFunction });
      interpreter.interpret(programRootNode);
      expect(printedStrings).toEqual(['hello', 'world!']);
    });

    it('compiles and runs a "hello world!" program with an assignment', () => {
      const programRootNode = Interpreter.buildFor(`
        foo := 'hello world!'
        puts(foo)
      `);
      const makeStringPool = memoize(() =>
        StringPool.makeForStrings(() => ['hello world!']));
      const { printedStrings, putsFunction } = makePutsFunction();
      const contextType = ContextType.make(makeStringPool(), {
        ...ContextType.defaultInjections(),
        putsFunction
      });
      const context = ExecutionContext.make( contextType );
      
      const fooNode = AstStringLiteralNode.make('foo');
      context.
        declareVariable({
          name: 'foo',
          type: context.executionTypeOf(fooNode).resolve() as ObjectType,
          operator: ':=',
          node: AstTupleNode.make(',', [fooNode])});
      const interpreter = Interpreter.make({
        ...Interpreter.defaultInjections(),
        makeStringPool,
        makeContext: () => context,
        makeContextType: () => contextType,
        putsFunction
      });
      interpreter.interpret(programRootNode);
      expect(printedStrings).toEqual(['hello world!']);
    });

    it('compiles and runs a simple program with a let declaration', () => {
      const programRootNode = Interpreter.buildFor(`
        let a := 'hello world!'
        puts(a)
      `);
      const { printedStrings, putsFunction } = makePutsFunction();
      const intr = Interpreter.make({
        ...Interpreter.defaultInjections(),
        putsFunction
      });
      intr.interpret(programRootNode);
      expect(printedStrings).toEqual(['hello world!']);
    });

    it('compiles and runs a simple adder program', () => {
      const programRootNode = Interpreter.buildFor(`
        let a := 2
        let b := a + 2
        puts(b)
      `);
      const { printedStrings, putsFunction } = makePutsFunction();
      const intr = Interpreter.make({
        ...Interpreter.defaultInjections(),
        putsFunction
      });
      intr.interpret(programRootNode);
      expect(printedStrings).toEqual(['4']);
    });

    it('compiles and runs a program with simple functions', () => {
      const rootNode = Interpreter.buildFor(`
        let a := fn
          puts('world')
        ~
        let b := fn puts('hello')
        
        b()
        a()
      `);
      const { printedStrings, putsFunction } = makePutsFunction();
      const intr = Interpreter.make({
        ...Interpreter.defaultInjections(),
        putsFunction
      });
      intr.interpret(rootNode);
      expect(printedStrings).toEqual(['hello', 'world']);
    });
  });
});
