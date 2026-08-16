import { Compiler } from '../src/compiler';
import { Helpers } from '../src/helpers';
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
      if (str === '\n')
        { return; }
      console.log(str);
      printedStrings.push(str);
    }
  });
  const { byteCode, importsObject, error } = compiler;
  if (!byteCode() || !importsObject()) {
    throw new Error(`Compilation failed: ${error()}`);
  }
  return WebSupport.getEntryPoint(compiler).then(entry => { entry(); });
}

function errorHandler(done: () => void) {
  return (err: unknown): never => {
    fail(err);
    done();
    throw err;
  };
}

function makeExampleRunner
  (getEntryPoint: EntryPointGetter)
  : (itStr: string, source: string, expectedPrintedStrings: string[]) => void
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
  makeExampleRunner,
  errorHandler
});
