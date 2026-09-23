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

import {
  FunctionLookUpTable,
  ObjectType 
} from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { WasmCompilation } from '../wasm_compilation';

const { freeze, memoize } = Helpers;

const typeBaseDefaults = memoize((): ObjectType => freeze({
  name: () => { raise('write me'); },
  lookUp(_0: string | symbol): FunctionLookUpTable | undefined
    { return undefined; },
  detuplify() { return undefined; },
  uid: () => raise('write me'),
  sizeInBytes: () => WasmCompilation.kWordSizeInBytes,
  sizeInStackItems: () => 1,
}));

export const BuiltinTypeBase = freeze({
  makeNewWithDefaults: (): ObjectType => freeze({
    ...typeBaseDefaults(),
    uid: memoize(Symbol)
  })
});

export const ConstantStringType = freeze({
  instance: memoize((): ObjectType =>
    freeze({
      ...BuiltinTypeBase.makeNewWithDefaults(),
      name: () => 'ConstantString',
    }))
});
