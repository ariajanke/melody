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

import { Helpers, StandardError, StandardErrorMessage } from '../../helpers';
import { ObjectType } from '../../melody_components';
import { NodeTypeEvaluation } from '../node_type_evaluation';
import { NodeTypeInference } from '../node_type_inference';
import { InitializerVariable } from './ordered_initial_sets_collection';

const { freeze, memoize } = Helpers;

export interface VariableTypeBreakdownBuild {
  initializerType(): ObjectType | undefined;
  typesBreakdown(): Readonly<ObjectType[]> | undefined;
  error(): StandardErrorMessage;
};

export const VariableTypeBreakdownBuild = freeze({
  make(mCurrentContext: ObjectType,
       mInitializer: InitializerVariable,
       mNodeTypeInference: NodeTypeInference = NodeTypeInference.make(),
       mError: StandardError = StandardError.make()): VariableTypeBreakdownBuild
  {
    const { setErrorFn, setErrorMessage, error } = mError;
    const { variableNames } = mInitializer;

    const initializerType_ = memoize((): ObjectType | undefined => {
      if (mInitializer.typeNode) {
        const { objectType, error } = NodeTypeEvaluation.
          make(mInitializer.valueNode);
        return objectType() ?? setErrorFn(error);
      }

      const trt = mNodeTypeInference.
        useFor(mCurrentContext).
        representationFor(mInitializer.valueNode);
      return trt.resultantType() ?? setErrorFn(trt.error);
    });

    const typesBreakdown = memoize((): Readonly<ObjectType[]> | undefined => {
      if (!initializerType_())
        { return undefined; }

      if (variableNames.length === 1)
        { return [initializerType_()!]; }

      const detuped = initializerType_()!.detuplify();
      if (!detuped) {
        return setErrorMessage('initializer type is not a tuple');
      }

      if (variableNames.length !== detuped.length) {
        return setErrorMessage('number of names do not match number of types');
      }

      return detuped;
    });

    return freeze({
      initializerType: (): ObjectType | undefined =>
        typesBreakdown() && initializerType_(),
      typesBreakdown,
      error
    });
  }
});
