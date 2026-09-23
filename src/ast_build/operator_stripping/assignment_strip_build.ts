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

import { Helpers } from '../../helpers';
import { AstNode } from '../../ast_node';
import { OperatorNamingSchema } from '../../operator_naming_schema';
import { Token } from '../../token';
import { StripBuild } from './strip_build';

const { freeze, memoize } = Helpers;

const kTransformOfAssignment = (contentFn: () => string) =>
  () => `${contentFn()}${OperatorNamingSchema.kAssignment}`;

function make
  (mRecurseOn: (n: AstNode) => AstNode | undefined,
   mOriginalCallName: Token,
   mReceiver: AstNode,
   mArgs: AstNode)
  : StripBuild
{
  const mStripping = StripBuild.
    makeBaseNameStripping(mOriginalCallName, mReceiver, kTransformOfAssignment);

  const node = memoize(() => {
    // NOTE assignment stripping is mandatory
    if (!mStripping.nameTarget() || !mStripping.strippedTree())
      { return undefined; }

    const callName = mStripping.nameTarget()!;
    const receiver = mRecurseOn(mStripping.strippedTree()!);
    const args = mRecurseOn(mArgs);
    if (receiver === undefined || args === undefined)
      { return undefined; }

    return AstNode.forOperatorStripping.makeCall(callName, receiver, args);
  });

  return freeze({
    node,
    error: mStripping.error
  });
}

export const AssignmentStripBuild = freeze({ make });
