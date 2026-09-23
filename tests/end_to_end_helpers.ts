/* Melody WASM Compiler
 *
 * Copyright (C) 2026 Aria Janke
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

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
