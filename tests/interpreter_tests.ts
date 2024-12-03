import { TestHelpers } from './test_helpers';
import { Interpreter } from '../src/interpreter';
import { ExecutionContext } from '../src/execution_context';
import { AstStringLiteralNode } from '../src/ast_string_literal_node';
import { ObjectType } from '../src/object_type';
import { AstTupleNode } from '../src/ast_tuple_node';

const { describeNamed } = TestHelpers;

describeNamed({ Interpreter }, () => {
  function makePutsFunction() {
    const printedStrings: string[] = [];
    const putsFunction = (str: string) => { printedStrings.push(str); };
    const askStringFunction = () : string => 'baats';
    const injections = { putsFunction, askStringFunction };

    return { injections, printedStrings };
  }
  function makeWithInjections(putsFunction: (s: string) => void, context?: ExecutionContext) {
    const defaultInjections = { putsFunction, askStringFunction: (): string => 'bees2' };
    const contextType = ExecutionContext.makeContextTypeWithInjections( defaultInjections );
    context ??= ExecutionContext.make( contextType );
    return Interpreter.make(context ?? ExecutionContext.make());
  }
  describe('integration specs', () => {
    it('compiles and runs a "hello world!" program', () => {
      const programRootNode = Interpreter.buildFor("puts('hello', 'there', ' world!')");
      const { printedStrings, injections } = makePutsFunction();
      const interpreter = makeWithInjections(injections.putsFunction);
      interpreter.interpret(programRootNode);
      expect(printedStrings).toEqual(['hello', 'there' ,' world!']);
    });

    it('compiles and runs a "hello world!" program with a variable', () => {
      const programRootNode = Interpreter.buildFor("puts(foo)");
      const { printedStrings, injections } = makePutsFunction();
      const contextType = ExecutionContext.makeContextTypeWithInjections( injections );
      const context = ExecutionContext.make( contextType );
      const fooNode = AstStringLiteralNode.make('foo');
      context.declareVariable({
        name: 'foo',
        type: context.executionTypeOf(fooNode).resolve() as ObjectType,
        operator: ':=',
        node: AstTupleNode.make(',', [fooNode])
      }).set('hello world!');
      const interpreter = Interpreter.make(context);
      interpreter.interpret(programRootNode);
      expect(printedStrings).toEqual(['hello world!']);
    });

    it('compiles and runs a multiline "hello world!" program', () => {
      const programRootNode = Interpreter.
      buildFor("puts('hello')\nputs('world!')");
      const { printedStrings, injections } = makePutsFunction();
      const interpreter = makeWithInjections(injections.putsFunction);
      interpreter.interpret(programRootNode);
      expect(printedStrings).toEqual(['hello', 'world!']);
    });

    it('compiles and runs a "hello world!" program with an assignment', () => {
      const programRootNode = Interpreter.buildFor(`
        foo := 'hello world!'
        puts(foo)
      `);
      const { printedStrings, injections } = makePutsFunction();
      const contextType = ExecutionContext.makeContextTypeWithInjections( injections );
      const context = ExecutionContext.make(contextType);
      const fooNode = AstStringLiteralNode.make('foo');
      context.
        declareVariable({
          name: 'foo',
          type: context.executionTypeOf(fooNode).resolve() as ObjectType,
          operator: ':=',
          node: AstTupleNode.make(',', [fooNode])}).
        set('wow');
      const intr = makeWithInjections(injections.putsFunction, context);
      intr.interpret(programRootNode);
      expect(printedStrings).toEqual(['hello world!']);
    });

    it('compiles and runs a simple program with a let declaration', () => {
      const programRootNode = Interpreter.buildFor(`
        let a := 'hello world!'
        puts(a)
      `);
      const { printedStrings, injections } = makePutsFunction();
      const intr = makeWithInjections(injections.putsFunction);
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
      const intr = makeWithInjections(injections.putsFunction);
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
      const intr = makeWithInjections(injections.putsFunction);
      intr.interpret(rootNode);
      expect(printedStrings).toEqual(['hello', 'world']);
    });
  });
});
