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

import { FunctionDefinitionRegistry } from '../function_definition_registry';
import { FunctionType } from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { WasmImportsSection } from './wasm_imports_section';
import { WasmTypesSection } from './wasm_types_section';

const { freeze, memoize } = Helpers;

export interface WasmFunctionRegistry {
  signatureIndexFor(functionType: FunctionType): number;
  indexOfRegisteredFor(functionType: FunctionType): number;
  wasmTypesSection(): WasmTypesSection;
};

function assertFtypeSignatureOkay(beingCalled: FunctionType): void {
  const emptyTuple = memoize(() =>
    FunctionType.emitEmptyTuple().parameters());
  const recSize = beingCalled.receiver().sizeInStackItems();
  const isFtypeOkay =
    beingCalled.returns().uid() === emptyTuple().uid() &&
    (recSize === 0 || recSize === 1);
  if (!isFtypeOkay) {
    raise('only one call signature supported');
  }
}

function wasmParameterCountFor(ftype: FunctionType): number {
  return ftype.parameters().sizeInStackItems() +
    ftype.receiver().sizeInStackItems();
}

function make
  (mTypesSection: WasmTypesSection,
   mImportsSection: WasmImportsSection,
   mRegistry: FunctionDefinitionRegistry)
  : WasmFunctionRegistry
{
  type FtypeUidToIndex = { [uid: symbol]: number | undefined };
  const { orderedDefinitions } = mRegistry;
  const ftypeMap = memoize(() =>
    orderedDefinitions().
    reduce((map: FtypeUidToIndex, ftype: FunctionType, idx: number) => {
      mImportsSection.functionCount();
      map[ftype.uid()] = idx;
      return map;
    }, {} as FtypeUidToIndex));
  const mFtypeToWasmTypes: { [stackItemCounts: number]: Readonly<'i32'[]> | undefined } = {};
  function newPtype(ftype: FunctionType): Readonly<'i32'[]> {
    const itemCount = wasmParameterCountFor(ftype);
    const m: 'i32'[] = [];
    m.length = itemCount;
    m.fill('i32', 0, itemCount);
    return m;
  }
  function intoPtype(ftype: FunctionType): Readonly<'i32'[]> {
    return mFtypeToWasmTypes[wasmParameterCountFor(ftype)] ??= newPtype(ftype);
  }


  const kNone = freeze([]);

  const wasmTypesSection = memoize(() => {
    // NOTE added for root
    mTypesSection.pushFunction(kNone, kNone);
    mRegistry.orderedDefinitions().forEach((ftype: FunctionType) => {
      mTypesSection.pushFunction(intoPtype(ftype), kNone);
    });
    return mTypesSection;
  });

  function signatureIndexFor(mFunctionType: FunctionType): number {
    assertFtypeSignatureOkay(mFunctionType);

    const pType = intoPtype(mFunctionType);
    const rType = kNone;
    // HACK/TODO indexFor may mutate types section!
    return wasmTypesSection().indexFor(pType, rType) ??
      raise('cannot get WASM function signature');
  }

  const indexOfRegisteredFor = (ftype: FunctionType): number =>
    ftypeMap()[ftype.uid()] ?? raise('ftype not registered');

  return freeze({
    signatureIndexFor,
    indexOfRegisteredFor,
    wasmTypesSection
  });
}

export const WasmFunctionRegistry = freeze({
  make,
  assertFtypeSignatureOkay
});
