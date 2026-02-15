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

  function handleError(err: unknown) {
    throw err;
  }

  ([
    [compileFromSource, 'compiler'],
    [interpretFromSource, 'interpreter']
  ] as [
    (source: string, printedStrings: string[]) => Promise<void>,
    string
  ][]).forEach(([getEntryPoint, name]) => {
    describe(`with a ${name}`, () => {
      it(`runs "Hello World!"`, (done: () => void) => {
        const source = `
          puts('Hello world!')
        `;
        const printedStrings: string[] = [];
        getEntryPoint(source, printedStrings).then(() => {
          expect(printedStrings).toEqual(['Hello world!']);
          done();
        }).catch(handleError);
      });

      it(`runs simple arithmetic`, (done: () => void) => {
        const source = `
          let a = 1 + 2 * 3
          let b = a - 4
          puts(a, b)
        `;
        const printedStrings: string[] = [];
        getEntryPoint(source, printedStrings).then(() => {
          expect(printedStrings).toEqual(['7', '3']);
          done();
        }).catch(handleError);
      });
        
      it(`runs function call`, (done: () => void) => {
        const source = `
          let f = fn
            puts('Hello world!')
          ~
          f()
        `;
        const printedStrings: string[] = [];
        getEntryPoint(source, printedStrings).then(() => {
          expect(printedStrings).toEqual(['Hello world!']);
          done();
        }).catch(handleError);
      });

      it(`runs a simple load and store`, (done: () => void) => {
        const source = `
          let a := 10
          a := 5
          puts(a)
        `;
        
        const printedStrings: string[] = [];
        getEntryPoint(source, printedStrings).then(() => {
          expect(printedStrings).toEqual(['5']);
          done();
        }).catch(handleError);
      });

      it(`runs function object reassignment`, (done: () => void) => {
        const source = `
          let f := fn
            puts('Hello world!')
          ~
          f := fn
            puts('Goodbye world!')
          ~
          f()
        `;
        // Something old Melody could not do!
        const printedStrings: string[] = [];
        getEntryPoint(source, printedStrings).then(() => {
          expect(printedStrings).toEqual(['Goodbye world!']);
          done();
        }).catch(handleError);
      });

      // beyond old Melody's abilities out of scope for this PR
      xit(`runs a function whose variable is out of local scope`, (done: () => void) => {
        const source = `
          let a = 10
          let f = fn
            puts(a)
          ~
          f()
        `;
        const printedStrings: string[] = [];
        getEntryPoint(source, printedStrings).then(() => {
          expect(printedStrings).toEqual(['10']);
          done();
        }).catch(handleError);
      });
    });
  });
});
