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

import { FunctionType } from './function_type_build';
import { Helpers, raise } from './helpers';

const { freeze } = Helpers;

export interface FunctionDefinitionRegistry {
  registerDefinitionBody(ftype: FunctionType, depth: number): void;
  rootDefinition(): FunctionType;
  orderedDefinitions(): Readonly<FunctionType[]>;
}

function make(): FunctionDefinitionRegistry {
  const mUids: { [uid: symbol]: FunctionType } = {};
  const mOrderedDefinitions: FunctionType[] = [];
  let mRootFtype: FunctionType | undefined = undefined;

  function registerDefinitionBody(ftype: FunctionType, depth: number) {
    if (mUids[ftype.uid()]) {
      raise('May not register a function more than once.');
    }
    mUids[ftype.uid()] = ftype;

    if (depth === 0) {
      mRootFtype = ftype;
    }
    mOrderedDefinitions.push(ftype);
  }

  const rootDefinition = () =>
    mRootFtype ?? raise('no root registered');

  const orderedDefinitions = () => mOrderedDefinitions;

  return freeze({ registerDefinitionBody, rootDefinition, orderedDefinitions });
}

export const FunctionDefinitionRegistry = freeze({ make });
