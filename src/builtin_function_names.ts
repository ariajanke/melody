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

import { Helpers } from './helpers';

const { freeze, memoize } = Helpers;

const kBuiltinNames = freeze({
  kSystemIoTable: '.SystemIO',
  kPuts: 'puts'
});

type StringSet = { [name: string]: true | undefined };
const namesAsSet = memoize((): Readonly<StringSet> => Object.
  keys(kBuiltinNames).
  reduce((acc: StringSet, name: string) => {
    acc[kBuiltinNames[name as keyof typeof kBuiltinNames]] = true;
    return acc;
  }, {} as StringSet));

function isBuiltinFunctionName(name: string): boolean {
  return namesAsSet()[name] !== undefined;
}

export const BuiltinFunctionNames = freeze({
  ...kBuiltinNames,
  isBuiltinFunctionName
});
