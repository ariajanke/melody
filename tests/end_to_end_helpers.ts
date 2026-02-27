import { Compiler } from '../src/compiler';
import { Helpers } from '../src/helpers';
import { Interpreter } from '../src/interpreter';
import { WebSupport } from '../src/web_support';

const { freeze } = Helpers;

export type EntryPointGetter =
  (source: string, printedStrings: string[]) => Promise<void>;

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
    if (!interpreter.run()) {
      throw new Error(`Interpretation failed: ${interpreter.error()}`);
    }
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

export const EndToEndHelpers = freeze({
  compileFromSource,
  interpretFromSource,
  makeExampleRunner
});
