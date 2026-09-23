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

// NOTE This file is considered out of scope for Melody
//      these utilities are added for use with the frontend

import { Compiler } from './compiler';
import { Helpers } from './helpers';

const { freeze, expose } = Helpers;

function getEntryPointOnInst(instance: WebAssembly.Instance | undefined): () => void {
  const exports = instance?.exports;
  if (exports && 'entry' in exports) {
    return exports.entry as () => void;
  } else {
    throw new Error('Failed to find entry point in WASM exports');
  }
}

function narrowToCompiler(compilerOrSource: Compiler | string, printer?: (str: string) => void): Compiler {
  if (typeof compilerOrSource === 'string') {
    return Compiler.
      make(compilerOrSource,
           {
            ...Compiler.defaultInjections(),
            puts: printer ?? console.log
           });
  }
  return compilerOrSource;
}

async function getEntryPointWithMemory
  (memory: WebAssembly.Memory,
   compilerOrSource: Compiler | string,
   printer?: (str: string) => void)
  : Promise<() => void>
{
  const compiler = narrowToCompiler(compilerOrSource, printer);
  const importsObject = {
    ...compiler.importsObject(),
    js: { memory }
  }  as WebAssembly.Imports;

  const byteCode = compiler.byteCode();
  if (!byteCode) {
    throw new Error(`Failed to compile Melody source: ${compiler.error()}`);
  }
  const result = await WebAssembly.instantiate(byteCode, importsObject);
  if ('instance' in result) {
    const res = result as unknown as WebAssembly.WebAssemblyInstantiatedSource;
    return getEntryPointOnInst(res.instance);
  }
  return getEntryPointOnInst(result); 
}

export const WebSupport = freeze({
  forTesting: { getEntryPointWithMemory },
  async getEntryPoint(compilerOrSource: Compiler | string, printer?: (str: string) => void) {
    const memory = new WebAssembly.Memory({
      initial: 1,
      maximum: 1,
    });
    for (let i = 0; i < 5000; ++i)
      new DataView(memory.buffer).setInt32(i*4, 4);
   return getEntryPointWithMemory(memory, compilerOrSource, printer);
  }
});

expose({ WebSupport });
