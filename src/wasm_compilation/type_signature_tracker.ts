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

import { Helpers } from '../helpers';
import { WasmType } from './wasm_helpers';

type KnownTypesTable = {
  [uid: symbol]: KnownTypesTable | undefined;
  isFor: 'parameters' | 'results' | undefined;
  index: number | undefined;
};

const { freeze, memoize, makeCounter } = Helpers;

const makeEmptyTable = (): KnownTypesTable & { i32: undefined, func: undefined } =>
  ({ isFor: undefined, index: undefined, i32: undefined, func: undefined });

const dividers: { [name: string]: { start: () => symbol } } = freeze({
  parameters: { start: memoize(Symbol) },
  results   : { start: memoize(Symbol) }
});

const mapTypeToKey = (() => {
  const cache: { [key in WasmType]?: symbol } = {};
  return (type: WasmType): symbol =>
    cache[type] ??= Symbol();
})();

export interface TypeSignatureTracker {
  indexFor
    (parameters: Readonly<WasmType[]>, results: Readonly<WasmType[]>)
    : number | undefined;
  makeIndexFor
    (parameters: Readonly<WasmType[]>, results: Readonly<WasmType[]>)
    : number;
};

function make(): TypeSignatureTracker {
  const mKnownTypesTable: KnownTypesTable = makeEmptyTable();
  const mCounter = makeCounter();

  function seekTableSpecificList
    (typesTable: KnownTypesTable,
     list: Readonly<WasmType[]>,
     isFor: 'parameters' | 'results')
    : KnownTypesTable
  {
    const next =
      typesTable[dividers[isFor].start()] ??= { isFor, index: undefined };
    typesTable = next;
    list.forEach((keyFn: WasmType) => {
      const next = typesTable[mapTypeToKey(keyFn)] ??=
        { isFor, index: undefined };
      typesTable = next;
    });
    return typesTable;
  }

  function seekTable
    (parameters: Readonly<WasmType[]>, results: Readonly<WasmType[]>)
    : KnownTypesTable
  {
    const afterParams =
      seekTableSpecificList(mKnownTypesTable, parameters, 'parameters');
    return seekTableSpecificList(afterParams, results, 'results');
  }

  return freeze({
    indexFor:
      (parameters: Readonly<WasmType[]>, results: Readonly<WasmType[]>): number | undefined =>
      seekTable(parameters, results).index,
    makeIndexFor:
      (parameters: Readonly<WasmType[]>, results: Readonly<WasmType[]>): number =>
      seekTable(parameters, results).index ??= mCounter()
  });
}

export const TypeSignatureTracker = freeze({ make });
