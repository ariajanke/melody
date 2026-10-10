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

import { AstIdentifierNode } from '../ast_node';
import { CodeWriter } from '../code_writer';
import { FunctionNamingSchema } from '../function_naming_schema';
import { FunctionTypeBuild } from '../function_type_build';
import { Helpers, StandardError } from '../helpers';
import { CodeEmission, EmissionContext, FunctionType, MelodyComponentVisitor, ObjectType } from '../melody_components';
import { ReceiverResolution } from './context_build';
import { ContextFrameSnapshot } from './context_frame_stack';
import { FunctionTypeFactory } from './function_type_association_set';
import { FunctionTypeBase } from './function_type_base';
import { TupleObjectType } from './tuple_object_type';

const { freeze, memoize } = Helpers;

function make2
  (mIdentifierNode: AstIdentifierNode,
   mContextType: ObjectType,
   mReceiverResolution: ReceiverResolution,
   mFunctionTypeFactory: FunctionTypeFactory,
   mError: StandardError = StandardError.make()
  )
{
  const { setErrorMessage } = mError;
  const { emptyTuple } = TupleObjectType;
  const mName = mIdentifierNode.token.content();
  const mFunctionName =
    mName === FunctionNamingSchema.kContextName ?
    mName :
    FunctionNamingSchema.mapToFringeAccessor(mName);

  const originalFtype = memoize(() =>
    mContextType.
    lookUp(mFunctionName)?.
    byParameters(emptyTuple()) ??
    setErrorMessage(`Cannot find function for "${mName}"`));

  const receiverFunctionType = memoize((): FunctionType | undefined => {
    if (!originalFtype())
      { return undefined; }

    const { receiver } = originalFtype()!;

    return mReceiverResolution.
      mapExpectedToReceiverAccessor(receiver()) ??
      setErrorMessage(`Cannot find receiver '${receiver().name()}'`);
  });

  const hasReceiver = () =>
    originalFtype()!.receiver().uid() !== emptyTuple().uid();

  const entity = memoize((): FunctionType | undefined => {
    if (!originalFtype())
      { return undefined; }

    if (hasReceiver()) {
      // need to synthesize a valid ftype
      // emission *could be* pending still!
      const newFtype = freeze({
        receiver: emptyTuple,
        parameters: originalFtype()!.parameters,
        returns: originalFtype()!.returns,
        uid: memoize(Symbol),
        visit<T>(visitor: MelodyComponentVisitor<T>): T
          { return visitor.visitFunctionType(newFtype); },
        emission: () => undefined,
        immediate: originalFtype()!.immediate
      });
      const createEmission =
        (originalFtypeEm: CodeEmission, receiverEm: CodeEmission) =>
      {
        function emit(writer: CodeWriter, ctx: EmissionContext): void {
          ctx.pushReceiver( receiverFunctionType()!.returns(), receiverEm );
          originalFtypeEm.emit(writer, ctx);
        }

        const emission = freeze({
          emit,
          uid: memoize(Symbol),
          visit<T>(visitor: MelodyComponentVisitor<T>): T
            { return visitor.visitCodeEmission(emission); },
        });

        return emission;
      };
      return newFtype;
    } else {
      // emission has to be composed
      // does every AST node need a ftype? couldn't hurt
      


      return originalFtype();
    }
  });
}

export const FringeFunctionBuild = freeze({
  make(mName: string, mTopSnapshot: ContextFrameSnapshot): FunctionTypeBuild {
    const { error, setErrorMessage } = StandardError.make();
    const { emptyTuple } = TupleObjectType;
    const { makeNewEmitlessEmpty, emitEmptyTuple } = FunctionTypeBase;

    const functionName =
      mName === FunctionNamingSchema.kContextName ?
      mName :
      FunctionNamingSchema.mapToFringeAccessor(mName);

    const originalFtype = memoize(() => mTopSnapshot.
      referenceType().
      lookUp(functionName)?.
      byParameters(emptyTuple()) ??
      setErrorMessage(`Cannot find function for "${mName}"`));

    const receiverFunctionType = memoize(() => {
      if (!originalFtype())
        { return undefined; }

      const { receiver } = originalFtype()!;

      return mTopSnapshot.
        receiverResolution().
        mapExpectedToReceiverAccessor(receiver()) ??
        setErrorMessage(`Cannot find receiver '${receiver().name()}'`);
    });

    const functionType = memoize(() => {
      const originalHasNoReceiver =
        originalFtype()?.receiver().uid() === emptyTuple().uid();
      if (!originalFtype() || originalHasNoReceiver)
        { return originalFtype(); }

      return freeze({
        ...makeNewEmitlessEmpty(),
        returns: originalFtype()!.returns,
        simpleEmit(writer: CodeWriter) {
          originalFtype()!.
            emit(receiverFunctionType()!, emitEmptyTuple(), writer);
        }
      });
    });

    return freeze({ functionType, error });
  }
});
