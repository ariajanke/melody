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
import { FunctionNamingSchema } from '../function_naming_schema';
import { FunctionTypeBuild } from '../function_type_build';
import { Helpers, raise, StandardError } from '../helpers';
import { FunctionTypeBase } from './function_type_base';
import { ContextFrameSnapshot } from './context_frame_stack';
import { AstNode } from '../ast_node';

const { freeze, memoize } = Helpers;

function make
  (mNamesDefined: readonly string[] | string, 
   mArgsNode: AstNode,
   mTopFrame: ContextFrameSnapshot)
  : FunctionTypeBuild
{
  const { error, setErrorFn } = StandardError.make();

  const argsBuild = memoize(() => mTopFrame.intoBuildFor(mArgsNode));

  const argsFType = memoize(() =>
    argsBuild().functionType() ?? setErrorFn(argsBuild().error));

  const mInitialSetName = FunctionNamingSchema.
    mapToInitialSetName(mNamesDefined);

  const initialSetter = memoize(() => {
    if (!argsFType())
      { return; }

    return mTopFrame.
      referenceType().
      lookUp(mInitialSetName)?.
      byParameters(argsFType()!.returns()) ??
      raise(`Cannot find "${mInitialSetName}"`);
  });

  const getReceiver = (() => {
    if (!initialSetter())
      { return undefined; }

    return mTopFrame.
      receiverResolution().
      mapExpectedToReceiverAccessor(initialSetter()!.receiver());
  });

  const functionType = memoize(() => {
    if (!initialSetter())
      { return undefined; }

    const rec = getReceiver()!;
    return freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      simpleEmit(writer: CodeWriter) {
        initialSetter()!.emit(rec, argsFType()!, writer);
        return writer;
      }
    });
  });

  return freeze({ functionType, error });
}

/// builds the function type roughly described by "let a := stuff" statements
export const InitializerFunctionBuild = freeze({ make });
