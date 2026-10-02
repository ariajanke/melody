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
import { Token } from '../../token';
import {
  OperatorDefinition,
  OperatorDefinitions,
  OperatorRelation
} from '../operator_definitions';

export interface OperatorDefinitionBuild {
  operatorDefinition(): OperatorDefinition | undefined;
  error(): StandardErrorMessage;
};

type InnerStoredInsts = {
  [isUnary in OperatorRelation]: OperatorDefinitionBuild | undefined
};

const { freeze, memoize } = Helpers;

const sGoodInsts: { [opContent: string]: InnerStoredInsts | undefined } = {};

const makeEmpty = (): InnerStoredInsts =>
  ({ 'binary': undefined, 'unary': undefined });

function getGoodInst
  (mOpToken: Token, mOperatorRelation: OperatorRelation): OperatorDefinitionBuild | undefined
{
  const gv = sGoodInsts[mOpToken.content()];
  if (!gv)
    { return gv; }

  return gv[mOperatorRelation];
}

function make(mOpToken: Token, mOperatorRelation: OperatorRelation): OperatorDefinitionBuild {
  // NOTE errorful instances will be individual
  //      if there's no error, we don't care
  const mTokenStr = mOpToken.content();
  const mGoodInst = getGoodInst(mOpToken, mOperatorRelation);
  if (mGoodInst)
    { return mGoodInst; }

  const { error, setErrorMessage } = StandardError.make();
  const operatorDefinition = memoize((): OperatorDefinition | undefined => {
    const getOperatorInfo = mOperatorRelation === 'unary' ?
      OperatorDefinitions.unaryMappings :
      OperatorDefinitions.binaryMappings;
    const info = getOperatorInfo()[mTokenStr];
    if (!info) {
      return setErrorMessage(
        `"${mTokenStr}" is not a valid operator (at least for ` +
        `the ${mOperatorRelation} context)`);
    }
    sGoodInsts[mTokenStr] ??= makeEmpty();
    sGoodInsts[mTokenStr][mOperatorRelation] ??= inst;
    return info;
  });

  const inst = freeze({ operatorDefinition, error });
  return inst;
}

export const OperatorDefinitionBuild = freeze({ make });
