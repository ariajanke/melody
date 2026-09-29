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

import { FunctionType, FunctionTypeBuild } from '../function_type_build';
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
  const mCurrentDepth = mContextFrameStack.depth();

  const { error, setErrorFn } = StandardError.make();
  const { registerDefinitionBody } = mFunctionRegistry;
  const { emptyTuple } = TupleObjectType;

  const parameterRetrieval = memoize((): ParametersTypeRetrieval | undefined => {
    const { retrieval, error } = ParametersTypeBuild.make(mParameters);
    return retrieval() ?? setErrorFn(error);
  });

  const definitionFtype = memoize((): FunctionType | undefined => {
    if (!parameterRetrieval())
      { return undefined; }

    const defBuild = DefinitionBodyFunctionBuild.
      make(mUid, parameterRetrieval()!, mNodes, mContextFrameStack);
    return defBuild.functionType() ?? setErrorFn(defBuild.error);
  });

  const parentType = memoize(() =>
    mCurrentDepth === 0 ?
    emptyTuple() : 
    mContextFrameStack.topFrame().referenceType());

  const recWrappedBodyFtype = memoize((): FunctionType | undefined => {
    if (!definitionFtype())
      { return undefined; }

    // NOTE concerns with the stack mutating
    parentType();
    const ftype = freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      receiver: parentType,
      simpleEmit: definitionFtype()!.simpleEmit
    });

    registerDefinitionBody(ftype, mCurrentDepth);
    return ftype;
  });

  const indexRepresentation = (() => FunctionIndexType.of(parentType()));

  const functionType = memoize((): FunctionType | undefined => {
    if (!recWrappedBodyFtype() || !parameterRetrieval())
      { return undefined; }

    return freeze({
      emit(_0: FunctionType, _1: FunctionType, _2: CodeWriter): void
        { raise('uh oh'); },
      uid: memoize(Symbol),
      // this is essentially a literal...
      receiver: emptyTuple,
      parameters: parameterRetrieval()!.asType,
      returns: indexRepresentation().functionIndexType,
      simpleEmit(writer: CodeWriter) {
        writer.pushIndexOfRegistered(recWrappedBodyFtype()!);
      }
    });
  });

  return freeze({ functionType, error });
}

export const DefinitionIndexFunctionBuild = freeze({ make });
