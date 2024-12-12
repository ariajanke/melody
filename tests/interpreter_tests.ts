import { TestHelpers } from './test_helpers';
import { Interpreter } from '../src/interpreter';
import { ExecutionContext } from '../src/execution_context';
import { AstStringLiteralNode } from '../src/ast_string_literal_node';
import { ObjectType } from '../src/object_type';
import { AstTupleNode } from '../src/ast_tuple_node';
import { BuiltInFunction, FunctionType } from '../src/function_type';
import { MemoryArray } from '../src/memory_array';
import { Helpers } from '../src/helpers';
import { ContextType } from '../src/context_type';

const { memoize } = Helpers;
const { describeNamed } = TestHelpers;

describeNamed({ Interpreter }, () => {
  function makePutsFunction() {
    const printedStrings: string[] = [];
    const putsFunction = (str: string) => { printedStrings.push(str); };
    const askStringFunction = () : string => 'baats';
    const injections = { putsFunction, askStringFunction };

    return { injections, printedStrings };
  }

  const makeInterpreterWithContext = (ctx: ExecutionContext) =>
    Interpreter.make({ ...Interpreter.defaultInjections(), makeContext: () => ctx });
  const makeContextTypeWithPuts = (putsFunction: (str: string) => void) =>
    ContextType.make({ ...ContextType.defaultInjections(), putsFunction });
  const makeInterpreterWithPuts = (putsFunction: (str: string) => void) =>
    makeInterpreterWithContext(ExecutionContext.
      make( makeContextTypeWithPuts(putsFunction) ));
  describe('integration specs', () => {
    it('compiles and runs a "hello world!" program', () => {
      const programRootNode = Interpreter.buildFor("puts('hello', 'there', ' world!')");
      const { printedStrings, injections } = makePutsFunction();
      const ctxtype = makeContextTypeWithPuts(injections.putsFunction);
      const ctx = ExecutionContext.make(ctxtype);
      const interpreter = makeInterpreterWithContext(ctx);
      interpreter.interpret(programRootNode);
      expect(printedStrings).toEqual(['hello', 'there' ,' world!']);
    });

    it('compiles and runs a "hello world!" program with a variable', () => {
      const programRootNode = Interpreter.buildFor("puts(foo)");
      const { printedStrings, injections } = makePutsFunction();
      const contextType = makeContextTypeWithPuts(injections.putsFunction);
      const context = ExecutionContext.make( contextType );
      const fooNode = AstStringLiteralNode.make('foo');
      const interpreterInjections = {
        makeMemory : memoize(MemoryArray.make),
        makeStack  : memoize( Interpreter.defaultInjections().makeStack ),
        makeContext: () => context
      };
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
          const stack = interpreterInjections.makeStack();
          stack.push().set('hello world!');
          bif(stack, interpreterInjections.makeMemory());
        });
      const interpreter = Interpreter.make({
        ...Interpreter.defaultInjections(),
        ...interpreterInjections
      });
      interpreter.interpret(programRootNode);
      expect(printedStrings).toEqual(['hello world!']);
    });

    it('compiles and runs a multiline "hello world!" program', () => {
      const programRootNode = Interpreter.
      buildFor("puts('hello')\nputs('world!')");
      const { printedStrings, injections } = makePutsFunction();
      const contextType = makeContextTypeWithPuts(injections.putsFunction);
      const context = ExecutionContext.make( contextType );
      const interpreter = makeInterpreterWithContext(context);
      interpreter.interpret(programRootNode);
      expect(printedStrings).toEqual(['hello', 'world!']);
    });

    it('compiles and runs a "hello world!" program with an assignment', () => {
      const programRootNode = Interpreter.buildFor(`
        foo := 'hello world!'
        puts(foo)
      `);
      const { printedStrings, injections } = makePutsFunction();
      const contextType = makeContextTypeWithPuts(injections.putsFunction);
      const context = ExecutionContext.make( contextType );
      
      const fooNode = AstStringLiteralNode.make('foo');
      context.
        declareVariable({
          name: 'foo',
          type: context.executionTypeOf(fooNode).resolve() as ObjectType,
          operator: ':=',
          node: AstTupleNode.make(',', [fooNode])});
          const interpreter = makeInterpreterWithContext(context);
      interpreter.interpret(programRootNode);
      expect(printedStrings).toEqual(['hello world!']);
    });

    it('compiles and runs a simple program with a let declaration', () => {
      const programRootNode = Interpreter.buildFor(`
        let a := 'hello world!'
        puts(a)
      `);
      const { printedStrings, injections } = makePutsFunction();
      const intr = makeInterpreterWithPuts(injections.putsFunction);
      intr.interpret(programRootNode);
      expect(printedStrings).toEqual(['hello world!']);
    });

    it('compiles and runs a simple adder program', () => {
      const programRootNode = Interpreter.buildFor(`
        let a := 2
        let b := a + 2
        puts(b)
      `);
      const { printedStrings, injections } = makePutsFunction();
      const intr = makeInterpreterWithPuts(injections.putsFunction);
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
      const { printedStrings, injections } = makePutsFunction();
      const intr = makeInterpreterWithPuts(injections.putsFunction);
      intr.interpret(rootNode);
      expect(printedStrings).toEqual(['hello', 'world']);
    });
  });
});
