import { TestHelpers } from './test_helpers';
import { Interpreter } from '../src/interpreter';
import { ExecutionContext } from '../src/execution_context';

const { describeNamed } = TestHelpers;

type PutsFunction = typeof console.log;

describeNamed({ Interpreter }, () => {
  function makePutsFunction() {
    const printedStrings: string[] = [];
    const putsFunction = (str: string) => { printedStrings.push(str); };
    const injections = { putsFunction };

    return { injections, printedStrings };
  }
  function makeWithInjections(putsFunction: PutsFunction, context?: ExecutionContext) {
    return Interpreter.make(context ?? ExecutionContext.make(), { putsFunction });
  }
  describe('integration specs', () => {
    it('compiles and runs a "hello world!" program', () => {
      const programRootNode = Interpreter.buildFor("puts('hello', ' world!')");
      const { printedStrings, injections } = makePutsFunction();
      const interpreter = makeWithInjections(injections.putsFunction);
      programRootNode.visit(interpreter);
      expect(printedStrings).toEqual(['hello', ' world!']);
    });

    // now comes the concept of a context, and variables
    // for now, I'm going to have a variable called "greeting", which stores a
    // string
    // that's it
    it('compiles and runs a "hello world!" program with a variable', () => {
      const context = ExecutionContext.make();
      context.declareVariable('foo').set('hello world!');
      const programRootNode = Interpreter.buildFor("puts(foo)");
      const { printedStrings, injections } = makePutsFunction();
      const interpreter = Interpreter.make(context, injections);
      programRootNode.visit(interpreter);
      expect(printedStrings).toEqual(['hello world!']);
    });

    it('compiles and runs a multiline "hello world!" program', () => {
      const programRootNode = Interpreter.
      buildFor("puts('hello')\nputs('world!')");
      const { printedStrings, injections } = makePutsFunction();
      const interpreter = makeWithInjections(injections.putsFunction);
      programRootNode.visit(interpreter);
      expect(printedStrings).toEqual(['hello', 'world!']);
    });

    it('compiles and runs a "hello world!" program with an assignment', () => {
      const programRootNode = Interpreter.buildFor(`
        foo := 'hello world!'
        puts(foo)
      `);
      const { printedStrings, injections } = makePutsFunction();
      const context = ExecutionContext.make();
      context.declareVariable('foo').set('wow');
      const intr = makeWithInjections(injections.putsFunction, context);
      programRootNode.visit(intr);
      expect(printedStrings).toEqual(['hello world!']);
    });

    it('compiles and runs a simple program with a let declaration', () => {
      const programRootNode = Interpreter.buildFor(`
        let a := 'hello world!'
        puts(a)
      `);
      const { printedStrings, injections } = makePutsFunction();
      const intr = makeWithInjections(injections.putsFunction);
      programRootNode.visit(intr);
      expect(printedStrings).toEqual(['hello world!']);
    });

    fit('compiles and runs a simple adder program', () => {
      const programRootNode = Interpreter.buildFor(`
        let a := 2
        let b := a + 2
        puts(b)
      `);
      const { printedStrings, injections } = makePutsFunction();
      const intr = makeWithInjections(injections.putsFunction);
      programRootNode.visit(intr);
      expect(printedStrings).toEqual(['4']);
    });
  });
});
