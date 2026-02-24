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


      // it(`runs "Hello World!"`, (done: () => void) => {
      //   const source = `
      //     puts('Hello world!')
      //   `;
      //   const printedStrings: string[] = [];
      //   getEntryPoint(source, printedStrings).then(() => {
      //     expect(printedStrings).toEqual(['Hello world!']);
      //     done();
      //   }).catch(handleError);
      // });

      // it(`runs simple arithmetic`, (done: () => void) => {
      //   const source = `
      //     let a = 1 + 2 * 3
      //     let b = a - 4
      //     puts(a, b)
      //   `;
      //   const printedStrings: string[] = [];
      //   getEntryPoint(source, printedStrings).then(() => {
      //     expect(printedStrings).toEqual(['7', '3']);
      //     done();
      //   }).catch(handleError);
      // });
        
      // it(`runs function call`, (done: () => void) => {
      //   const source = `
      //     let f = fn
      //       puts('Hello world!')
      //     ~
      //     f()
      //   `;
      //   const printedStrings: string[] = [];
      //   getEntryPoint(source, printedStrings).then(() => {
      //     expect(printedStrings).toEqual(['Hello world!']);
      //     done();
      //   }).catch(handleError);
      // });

      // it(`runs a simple load and store`, (done: () => void) => {
      //   const source = `
      //     let a := 10
      //     a := 5
      //     puts(a)
      //   `;
        
      //   const printedStrings: string[] = [];
      //   getEntryPoint(source, printedStrings).then(() => {
      //     expect(printedStrings).toEqual(['5']);
      //     done();
      //   }).catch(handleError);
      // });

      // it(`runs function object reassignment`, (done: () => void) => {
      //   const source = `
      //     let f := fn
      //       puts('Hello world!')
      //     ~
      //     f := fn
      //       puts('Goodbye world!')
      //     ~
      //     f()
      //   `;
      //   // Something old Melody could not do!
      //   const printedStrings: string[] = [];
      //   getEntryPoint(source, printedStrings).then(() => {
      //     expect(printedStrings).toEqual(['Goodbye world!']);
      //     done();
      //   }).catch(handleError);
      // });

      // beyond old Melody's abilities out of scope for this PR
      xit(`runs a function whose variable is out of local scope`, (done: () => void) => {
        const source = `
          let a = 10
          let f = fn
            let f2 = fn
              puts(a)
            ~
            f2()
            puts(a)
          ~
          f()
        `;
        const printedStrings: string[] = [];
        getEntryPoint(source, printedStrings).then(() => {
          expect(printedStrings).toEqual(['10', '10']);
        }).catch(errorHandler(done));
      });
    });
  });
});
