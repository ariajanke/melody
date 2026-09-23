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

import { FunctionNamingSchema } from '../../function_naming_schema';
import { Helpers, StandardError } from '../../helpers';
import { AstNode } from '../../ast_node';
import { Token } from '../../token';
import { StripBuild, StripBuildResult } from './strip_build';

const { freeze, memoize } = Helpers;

const { mapToFringeAccessor } = FunctionNamingSchema;

const {
  tokenize,
  makeCall,
  emptyTupleInstance
} = AstNode.forOperatorStripping;

function make
  (mRecurseOn: (n: AstNode) => AstNode | undefined,
   mOriginalCallName: Token,
   mReceiver: AstNode,
   mArgs: AstNode)
  : StripBuild
{
  const { error, setErrorMessage } = StandardError.make();
  const idName = () =>
    tokenize(mArgs) ??
    setErrorMessage(`Token following (${mOriginalCallName.end()}) must be an identifier`);

  const callName = memoize((): Token | undefined => {
    const name = idName();
    if (name === undefined)
      { return undefined; }

    return freeze({
      start  : mOriginalCallName.start,
      end    : name.end,
      content: memoize(() => mapToFringeAccessor(name.content())),
      type   : name.type
    });
  });

  const node = memoize((): StripBuildResult => {
    if (!callName())
      { return undefined; }

    const rec = mRecurseOn(mReceiver);
    if (!rec)
      { return undefined; }

    
    return makeCall(callName()!, rec, emptyTupleInstance());
  });

  return freeze({ node, error });
}

export const DotStripBuild = freeze({ make });
