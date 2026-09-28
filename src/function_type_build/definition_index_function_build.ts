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

import { FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { Helpers, raise, StandardError } from '../helpers';
import { FunctionTypeBase } from './function_type_base';
import { CodeWriter } from '../code_writer';
import { WritableContextFrameStack } from './context_frame_stack';
import { FunctionDefinitionRegistry } from '../function_definition_registry';
import { DefinitionBodyFunctionBuild } from './definition_body_function_build';
import { FunctionIndexType } from './function_index_type';
import { TupleObjectType } from './tuple_object_type';
import { AstNameExpression, AstNode } from '../ast_node';
import { ParametersTypeBuild, ParametersTypeRetrieval } from './parameters_type_build';

const { freeze, memoize } = Helpers;

function make
  (mUid: number,
   mParameters: Readonly<AstNameExpression[]>,
   mNodes: Readonly<AstNode[]>,
   mFunctionRegistry: FunctionDefinitionRegistry,
   mContextFrameStack: WritableContextFrameStack)
  : FunctionTypeBuild
{
  const mParameterTypes = ParametersTypeBuild.make(mParameters);
  const mDefBuild = DefinitionBodyFunctionBuild.
    make(mUid, mParameterTypes, mNodes, mContextFrameStack);
  const { error, setErrorFn } = StandardError.make();
  const { registerDefinitionBody } = mFunctionRegistry;
  const { emptyTuple } = TupleObjectType;

  const mCurrentDepth = mContextFrameStack.depth();

  const parentType = memoize(() =>
    mCurrentDepth === 0 ?
    emptyTuple() : 
    mContextFrameStack.topFrame().referenceType());

  const recWrappedBodyFtype = memoize(() => {
    const compositeFunctionType = mDefBuild.functionType();
    if (!compositeFunctionType)
      { return setErrorFn(mDefBuild.error); }

    // evaluation deference is this thing's greatest strength and weakness
    parentType();
    const ftype = freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      receiver: parentType,
      simpleEmit: compositeFunctionType.simpleEmit
    });

    registerDefinitionBody(ftype, mCurrentDepth);
    return ftype;
  });

  const indexRepresentation = (() => FunctionIndexType.of(parentType()));

  const functionType = memoize((): FunctionType | undefined => {
    if (!recWrappedBodyFtype())
      { return undefined; }

    if (!mParameterTypes.asType())
      { return setErrorFn(mParameterTypes.error); }

    const parameters = mParameterTypes.asType as () => ObjectType;
    
    return freeze({
      emit(_0: FunctionType, _1: FunctionType, _2: CodeWriter): void
        { raise('uh oh'); },
      uid: memoize(Symbol),
      // this is essentially a literal...
      receiver: emptyTuple,
      parameters,
      returns: indexRepresentation().functionIndexType,
      simpleEmit(writer: CodeWriter) {
        writer.pushIndexOfRegistered(recWrappedBodyFtype()!);
      }
    });
  });

  return freeze({ functionType, error });
}

export const DefinitionIndexFunctionBuild = freeze({ make });
