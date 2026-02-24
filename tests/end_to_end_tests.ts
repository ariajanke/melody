import { Compiler } from '../src/compiler';
import { Interpreter } from '../src/interpreter';
import { WebSupport } from '../src/web_support';

describe('end-to-end', () => {
  function compileFromSource
    (source: string, printedStrings: string[]): Promise<void>
  {
    const compiler = Compiler.make(source, {
      ...Compiler.defaultInjections(),
      puts(str: string) {
        printedStrings.push(str);
      }
    });
    const { byteCode, importsObject, error } = compiler;
    if (!byteCode() || !importsObject()) {
      throw new Error(`Compilation failed: ${error()}`);
    }
    return WebSupport.getEntryPoint(compiler).then(entry => { entry(0); });
  }

  type EntryPointGetter =
    (source: string, printedStrings: string[]) => Promise<void>;

  function interpretFromSource(source: string, printedStrings: string[]): Promise<void> {
    const interpreter = Interpreter.make(source, {
      ...Interpreter.defaultInjections(),
      putsFunction(str: string) {
        printedStrings.push(str);
      }
    });
    return new Promise((resolve, _1) => {
      interpreter.run();
      resolve();
    });
  }

  function errorHandler(done: () => void) {
    return (err: unknown) => {
      done();
      throw err;
    };
  }

  function makeExampleRunner
    (getEntryPoint: EntryPointGetter)
  {
    return function (itStr: string, source: string, expectedPrintedStrings: string[]) {
      it(itStr, (done: () => void) => {
        const printedStrings: string[] = [];
        getEntryPoint(source, printedStrings).then(() => {
          expect(printedStrings).toEqual(expectedPrintedStrings);
          done();
        }).catch(errorHandler(done));
      });
    };
  }

  ([
    [compileFromSource, 'compiler'],
    [interpretFromSource, 'interpreter']
  ] as [
    EntryPointGetter,
    string
  ][]).forEach(([getEntryPoint, name]) => {
    describe(`with a ${name}`, () => {
      const doRun = makeExampleRunner(getEntryPoint);

      doRun(`runs "Hello World!"`, `
        puts('Hello world!')
      `, ['Hello world!']);

      doRun(`runs simple arithmetic`, `
        let a = 1 + 2 * 3
        let b = a - 4
        puts(a, b)
      `, ['7', '3']);
        
      doRun(`runs function call`, `
        let f = fn
          puts('Hello world!')
        ~
        f()
      `, ['Hello world!']);

      doRun(`runs a simple load and store`, `
        let a := 10
        a := 5
        puts(a)
      `, ['5']);

      doRun(`runs function object reassignment`, `
        let f := fn
          puts('Hello world!')
        ~
        f := fn
          puts('Goodbye world!')
        ~
        f()
      `, ['Goodbye world!']);

      // beyond old Melody's abilities out of scope for this PR
      xit(`runs a function whose variable is out of local scope`, (done: () => void) => {
        const source = `
          let a = 10
          let f1 = fn
            # <context>.parent
            # could be <root> or <f2>
            let f1a = fn
              # define "a" = <f1>.a
              # <f1> as fixed type
              # but <context>.parent changes type?
              puts(a)
            ~
            f1a()
            # define "a" = <root>.a
            # following a lexical path
            puts(a)
          ~
          let f2 = fn
            let a = 20
            # how did we get f1 here?
            # call .f1, it's pulled from root
            # could just pass in root as the context, done!
            f1() # prints 10, not 20
          ~
          let f3 = fn
            let a = 30
            let f3a = fn
              puts(a) # prints 30, not 20 or 10
            ~
            f3a()
          ~
          f1()
          f2()
          f3()
        `;
        const printedStrings: string[] = [];
        getEntryPoint(source, printedStrings).then(() => {
          expect(printedStrings).toEqual(['10', '10']);
        }).catch(errorHandler(done));
      });
    });
  });
});
