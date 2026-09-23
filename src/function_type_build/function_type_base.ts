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

import { CodeWriter } from '../code_writer';
import { FunctionType } from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { TupleObjectType } from './tuple_object_type';

const { freeze, memoize } = Helpers;
const makeUid = () => memoize(Symbol);
const { emptyTuple } = TupleObjectType;

const common = memoize(() => freeze({
  parameters: emptyTuple,
  returns: emptyTuple,
  receiver: emptyTuple,
  simpleEmit: (_0: CodeWriter) =>
    raise('This function cannot be simply emitted'),
  emit(_0: FunctionType,
       _1: FunctionType,
       _2: CodeWriter)
  {
    raise('This function cannot be emitted (at least this way).');
  },
  uid: () => raise('should not be reached')
}));

function makeNewEmitlessEmpty() {
  return freeze({
    ...common(),
    uid: makeUid()
  });
}

const emitEmptyTuple = memoize((): FunctionType =>
  freeze({
    ...makeNewEmitlessEmpty(),
    simpleEmit(_0: CodeWriter) {},
  }));

export const FunctionTypeBase = freeze({
  makeNewEmitlessEmpty,
  emitEmptyTuple
});
