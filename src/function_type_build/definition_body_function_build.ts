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

import { Helpers, StandardError } from '../helpers';
import { FunctionType, FunctionTypeBuild } from '../function_type_build';
import { ContextFrameSnapshot, WritableContextFrameStack } from './context_frame_stack';
import { ContextDeclarationBuild, ContextLinkStage } from './context_build';
import { CachingContextProgression } from './caching_context_progression';
import { ContextualizedBodyFunctionBuild } from './contextualized_body_function_build';
import { AstNode } from '../ast_node';
import { ContextBaseNamesSet } from './context_base_names_set';

const { freeze, memoize } = Helpers;

function make
  (mUid: number,
   mNodes: Readonly<AstNode[]>,
   mStackFrameStack: WritableContextFrameStack)
  : FunctionTypeBuild
{
  const { error, setErrorFn } = StandardError.make();

  const baseStage = memoize(() =>
    ContextBaseNamesSet.instance().ensure(mUid));

  const namesRetrieval = memoize(() =>
    ContextBaseNamesSet.instance().contextNamesFor(mUid, mNodes));

  const linkStage = memoize((): ContextLinkStage =>
    baseStage().contextLinkStage( namesRetrieval().pendingNames(), mStackFrameStack ));

  const fullContextBuild = memoize((): ContextDeclarationBuild =>
    linkStage().next(namesRetrieval().declarations(), contextTypeProgression()));

  const contextTypeProgression = memoize(() => CachingContextProgression.
    make(mStackFrameStack,
         linkStage().receiverResolution(),
         baseStage().referenceType().name()
     ));

  const aggregateType = () => fullContextBuild()?.aggregateType();

  const finalFrameSnapshot = memoize((): ContextFrameSnapshot | undefined => {
    const { referenceType } = fullContextBuild();
    if (!referenceType()) {
      return setErrorFn(fullContextBuild().error);
    }

    return freeze({
      ...contextTypeProgression().baseFrameEntry(),
      referenceType: () => referenceType()!
    });
  });

  // TODO
  // verify that initial sets are called in proper order

  const functionType = memoize((): FunctionType | undefined => {
    if (!finalFrameSnapshot())
      { return undefined; }

    return mStackFrameStack.withBaseReferenceType(finalFrameSnapshot()!, () => {
      const fbuild = ContextualizedBodyFunctionBuild.
        make(linkStage().preface(),
             aggregateType()!,
             mNodes,
             mStackFrameStack.intoBuildFunction());

      return fbuild.functionType() ?? setErrorFn(fbuild.error);
    });
  });

  return freeze({ functionType, error });
}

export const DefinitionBodyFunctionBuild = freeze({ make });
