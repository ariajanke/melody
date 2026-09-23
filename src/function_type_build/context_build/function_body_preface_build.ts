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

import { Helpers, raise } from '../../helpers';
import { CodeWriter } from '../../code_writer';
import { FunctionTypeBase } from '../function_type_base';
import { FunctionNamingSchema } from '../../function_naming_schema';
import { UsedAncestorCollection } from './used_ancestor_collection';
import { ContextAttributeFactory } from './context_attribute_factory';
import { VariableAllocation } from './variable_allocation';
import { FunctionType, ObjectType } from '../../function_type_build';
import { AncestorTupleEmission } from './ancestor_tuple_emission';
import { TupleObjectType } from '../tuple_object_type';

const { freeze, memoize } = Helpers;

// TODO this has an "and" and probably should be split up
//      preface ftype AND ancestor accessors (yuck!)
export interface FunctionBodyPrefaceBuild {
  functionType(): FunctionType;
};

function makeRefGet(name: string, why: string) {
  return (obj: ObjectType): FunctionType => obj.
    lookUp(name)?.byParameters(TupleObjectType.emptyTuple()) ?? raise(why);
}

const selfReferenceOf =
  makeRefGet(FunctionNamingSchema.kContextName,
             'cannot find self reference function <context>');

function make
  (mVariableAllocation: VariableAllocation,
   mUsedAncestorCollection: UsedAncestorCollection,
   mReferenceType: ObjectType)
  : FunctionBodyPrefaceBuild
{
  const { parent } = mUsedAncestorCollection;

  const ancestorTupleReturns = memoize(() =>
    TupleObjectType.instanceFor(mUsedAncestorCollection.ancestors().map(({ type }) => type)));

  const ancestorTupleEmission = memoize((): FunctionType => {
    if (!parent())
      { raise('need parent'); }

    const emission = AncestorTupleEmission.
      make(mReferenceType,
           parent()!.type,
           mUsedAncestorCollection.allAncestorsOrdered());

    return freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      simpleEmit: emission.emitterFunction(),
      returns: ancestorTupleReturns
    });
  });

  const parentIndex = memoize(() => {
    if (!parent())
      { return undefined; }

    return mVariableAllocation.lookUp(parent()!.variableName)?.
           accessIndex ?? raise('variable and used ancestors conflict');
  });

  const ancestorTupleName = () =>
    mUsedAncestorCollection.
    ancestors().
    map(value => value.variableName);

  const ancestorInitialSet = memoize((): FunctionType | undefined => {
    if (!parent() || mUsedAncestorCollection.ancestors().length === 0)
      { return undefined; }

    const varInfo =
      mVariableAllocation.lookUpTuple(ancestorTupleName()) ??
      raise('ancestors must be allocated in order');
    // NOTE make sure we build this before emission
    if (ancestorTupleEmission().returns().uid() !==
        varInfo.type.uid())
    {
      raise('The ancestor tuple variable type must match the tuple emission.');
    }

    const contextGetter = selfReferenceOf(mReferenceType);
    const setter = ContextAttributeFactory.
      make(mReferenceType).
      buildInitialSetter(varInfo.accessIndex, varInfo.type);
    
    return freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      simpleEmit(writer: CodeWriter) {
        setter.emit(contextGetter!, ancestorTupleEmission(), writer);
      }
    });
  });

  const functionType = memoize((): FunctionType => freeze({
    ...FunctionTypeBase.makeNewEmitlessEmpty(),
    simpleEmit(writer: CodeWriter) {
      writer.saveStackPointerToLocal();

      if (parentIndex() !== undefined) {
        writer.storeParentPointer(parentIndex()!);
      }

      ancestorInitialSet()?.simpleEmit(writer);
    },
  }));

  return freeze({ functionType });
}

export const FunctionBodyPrefaceBuild = freeze({ make });
