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

import { ObjectType } from '../function_type_build';
import { Helpers, raise, StandardError, StandardErrorMessage } from '../helpers';
import { TupleObjectType } from './tuple_object_type';
import { NodeTypeEvaluation } from './node_type_evaluation';
import { AstParameterExpression } from '../ast_node';

const { freeze, memoize } = Helpers;

type WritablePairs = [string, ObjectType][];

export type NameObjectTypePairs = Readonly<WritablePairs>;

export interface ParametersTypeRetrieval {
  // TODO this will eventually be affected by "InterfaceTypes" for generics
  asNameExpressions(): Readonly<AstParameterExpression[]>;
  asType(): ObjectType;
  orderedNameTypePairs(): NameObjectTypePairs;
};

export interface ParametersTypeBuild {
  retrieval(): ParametersTypeRetrieval | undefined;
  error(): StandardErrorMessage;
};

const grabType = (pair: [string, ObjectType]): ObjectType => pair[1];

function make
  (mParameters: Readonly<AstParameterExpression[]>,
   mNodeTypeEvalCtor = NodeTypeEvaluation.make)
  : ParametersTypeBuild
{
  const { setErrorFn, setErrorMessage, error } = StandardError.make();

  function nameExpressionInto
    (pairs: WritablePairs | undefined, nameExpr: AstParameterExpression): WritablePairs | undefined
  {
    if (!pairs)
      { return pairs; }

    const oTypeBuild = mNodeTypeEvalCtor(nameExpr.typeNode);
    const fullType = oTypeBuild.objectType();
    if (!fullType)
      { return setErrorFn(oTypeBuild.error); }

    const namesLength = nameExpr.names.length;

    if (namesLength === 0)
      { raise('invalid name expression there must be at least one name'); }

    if (namesLength === 1) {
      pairs.push([nameExpr.names[0].content(), fullType]);
      return pairs;
    }

    const subTypes = fullType.detuplify();
    if (!subTypes) {
      return setErrorMessage('cannot break up non tuple type');
    }

    if (subTypes.length !== namesLength) {
      return setErrorMessage('tuple length does not match number of names');
    }

    for (let i = 0; i < namesLength; ++i) {
      pairs.push([ nameExpr.names[i].content(), subTypes[0] ]);
    }
    return pairs;
  }

  const retrieval = memoize((): ParametersTypeRetrieval | undefined => {
    const params = mParameters.reduce(nameExpressionInto, []);
    if (!params)
      { return undefined; }

    return freeze({
      asNameExpressions: () => mParameters,
      orderedNameTypePairs: () => params,
      asType: memoize(() => TupleObjectType.instanceFor(params.map(grabType)))
    });
  });

  return freeze({
    retrieval,
    error
  });
}

export const ParametersTypeBuild = freeze({ make });
