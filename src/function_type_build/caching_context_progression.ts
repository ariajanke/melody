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

import { FunctionTypeBuild, ObjectType } from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { AstNode } from '../ast_node';
import { ReceiverResolution } from './context_build';
import { ContextFrameSnapshot, WritableContextFrameStack } from './context_frame_stack';

const { freeze, memoize } = Helpers;

export interface CachingContextProgression {
  baseFrameEntry(): ContextFrameSnapshot;
};

function make
  (mStackFrameStack: WritableContextFrameStack,
   mReceiverResolution: ReceiverResolution,
   mUniqueName: string)
  : CachingContextProgression
{
  const mCache: { [astNodeUid: number]: FunctionTypeBuild | undefined } = {};

  const mIntoFunctionTypeBuild = mStackFrameStack.intoBuildFunction();
  
  const baseFrameEntry = memoize((): ContextFrameSnapshot => freeze({
    referenceType: () => raise('should never be called'),
    receiverResolution: () => mReceiverResolution,
    uniqueName: () => mUniqueName,
    intoBuildFor: (node: AstNode) =>
      mCache[node.uid()] ?? mIntoFunctionTypeBuild(node)
  }));

  function nextUndeferredBuild
    (currentFrameType: ObjectType, node: AstNode)
    : FunctionTypeBuild
  {
    const snapshot = freeze({
      ...baseFrameEntry(),
      referenceType: () => currentFrameType
    });

    return mStackFrameStack.withBaseReferenceType(snapshot, () => {
      const fbuild = mIntoFunctionTypeBuild(node);
      
      // NOTE undeferred, and we rely on memoization
      fbuild.functionType();
      mCache[node.uid()] = fbuild;

      return fbuild;
    });
  }
  
  return freeze({ nextUndeferredBuild, baseFrameEntry });
}

export const CachingContextProgression = freeze({ make });
