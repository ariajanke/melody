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

import { Helpers, raise } from '../helpers';
import {
  TypesAware,
  type FuncImportDescription
} from './wasm_helpers';
import { WasmTypesSection } from './wasm_types_section';
import { WasmImportsSection } from './wasm_imports_section';
import { StringPool } from './string_pool';

const { freeze, memoize, makeCounter } = Helpers;

interface NamedFuncImportDescription extends FuncImportDescription {
  name: string;
};

const descriptions = memoize(()
  : { [name: string]: FuncImportDescription | undefined } =>
{
  const { i32 } = TypesAware.types();
  const next = makeCounter();

  return freeze({
    printInteger: {
      index  : next(),
      args   : [i32],
      returns: []
    },
    printString: {
      index  : next(),
      args   : [i32],
      returns: []
    },
    askString: {
      index  : next(),
      args   : [],
      returns: [i32]
    },
    askInteger: {
      index  : next(),
      args   : [],
      returns: [i32] 
    }
  });
});

const descriptionsInIndexOrder = memoize(()
  : Readonly<NamedFuncImportDescription[]> =>
{
  const descriptions_ = descriptions();
  return Object.keys(descriptions_)
    .map(name => ({ name, ...descriptions_[name]! }))
    .sort((a, b) => a.index - b.index);
});

export interface WasmBuiltinImportsCreation {
  importObject(): Readonly<{
    imports: {
      printInteger(i: number): void;
      printString(i: number): void;
      askString: () => number;
      askInteger: () => number;
      }
    }>,
  typesSection(): WasmTypesSection;
  importsSection(): WasmImportsSection;
};

function make
  (mStringPool: StringPool,
   mJsPrint: (s: string) => void,
   mJsAskInteger: () => number,
   mJsAskString: () => number)
  : WasmBuiltinImportsCreation
{
  const importObject = memoize(() => freeze({
    imports:
      {
        printInteger(i: number) {
          mJsPrint(i.toString());
        },
        printString(i: number) {
          mJsPrint(mStringPool.mapToString(i) ?? '<??UNKNOWN??>');
        },
        askString: mJsAskString,
        askInteger: mJsAskInteger
      }
  }));

  const getDescription = (name: string): FuncImportDescription =>
    descriptions()[name] ?? raise(`no such "${name}"`);

  const typesSection = memoize(() => {
    let typeSec = WasmTypesSection.make();
    Object.keys(descriptions()).forEach((name: string) => {
      const { args, returns } = getDescription(name);
      typeSec = typeSec.pushFunction(args, returns);
    });
    return typeSec;
  });

  const importsSection = memoize(() => {
    let imptSec = WasmImportsSection.make();
    const typeSec = inst.typesSection();

    // NOTE must push in order, to make sure indices are correct
    descriptionsInIndexOrder().forEach(({ name, args, returns }) => {
      const index = typeSec.indexFor( args, returns );
      if (index === undefined) {
        raise(`Index for "${name}" not defined`);
      }
      imptSec = imptSec.pushFunction(index, 'imports', name);
    });
    return imptSec;
  });

  const inst = freeze({
    importObject,
    typesSection,
    importsSection
  });
  return inst;
}

export const WasmBuiltinImportsCreation = freeze({
  descriptions,
  descriptionsInIndexOrder,
  make
});
