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

import { Helpers, raise } from '../helpers';
import { OperatorNamingSchema } from '../operator_naming_schema';

const { freeze, memoize } = Helpers;

type OperatorRelation = 'binary' | 'unary';

interface OperatorDefinitionMut {
  representation: string;
  precedence: number;
  relation: OperatorRelation;
  isPositionReversed: boolean;
};

export type OperatorDefinition = Readonly<OperatorDefinitionMut>;

export type OperatorDefinitionDictionary = Readonly<{
  [representation: string]: OperatorDefinition | undefined
}>;

const operandRelationships = freeze({
  binary: 'binary',
  unary : 'unary'
});

function intoMappingFor(pred: (s: OperatorRelation) => boolean)
  : OperatorDefinitionDictionary
{
  const mappings = OperatorDefinitions.
    fullListing().
    filter(({ relation }) => pred(relation)).
    map((def: OperatorDefinition): OperatorDefinitionDictionary =>
      ({ [def.representation]: def }));
  return Object.assign({}, ...mappings);
}

const unaryMappings = memoize((): OperatorDefinitionDictionary =>
  intoMappingFor((rel: OperatorRelation) => rel === 'unary'));
const binaryMappings = memoize((): OperatorDefinitionDictionary =>
  intoMappingFor((rel: OperatorRelation) => rel === 'binary'));
const allMappings = memoize((): OperatorDefinitionDictionary =>
  intoMappingFor((_0: OperatorRelation) => true));

interface OperatorDefinitionFactory {
  reversePositionalPrecedence(): OperatorDefinitionFactory;
  binary(representation: string): OperatorDefinitionFactory;    
  unary(representation: string): OperatorDefinitionFactory;
  finish(): Readonly<OperatorDefinition[]>;
};

const OperatorDefinitionFactory = freeze({
  make(): OperatorDefinitionFactory {
    let mPrecValue = 0;
    let mFinished = false;
    const mOperators: OperatorDefinition[] = [];
    let mPositionReverse: boolean = false;
    const verifyNotFinished = () => {
      if (!mFinished)
        { return inst; }

      raise('Already finished!');
    };
    const increment = () => {
      mPrecValue += 1;
      return mPrecValue;
    };
    const push = (representation: string, relation: OperatorRelation) => {
      const precedence = increment();
      const isPositionReversed = mPositionReverse;
      mOperators.push(freeze({
        representation,
        relation,
        precedence,
        isPositionReversed
      }));
      return verifyNotFinished();
    };
    const { binary, unary } = operandRelationships;
    const inst = freeze({
      reversePositionalPrecedence() {
        mPositionReverse = !mPositionReverse;
        return verifyNotFinished();
      },
      binary: (representation: string) =>
        push(representation, binary),
      unary: (representation: string) =>
        push(representation, unary),
      finish: memoize((): Readonly<OperatorDefinition[]> => {
        mFinished = true;
        return mOperators;
      })
    });
    return inst;
  }
});

export const OperatorDefinitions = freeze({
  unaryMappings,
  binaryMappings,
  assertIsOperator(op: string): void {
    if (allMappings()[op] !== undefined)
      { return; }

    raise(`"${op}" is not on the operator definition map`);
  },
  fullListing: memoize((): Readonly<OperatorDefinition[]> => {
    const {
      kLet, kAnd, kOr, kIs, kNot, kComma, kPlus, kMinus, kMultiply, kDivide,
      kDot, kEquality, kCall, kAssignment
    } = OperatorNamingSchema;
    const factory = OperatorDefinitionFactory.make();
    return factory.
      unary (kLet).
      binary(kComma).
      binary(kIs).
      binary(kEquality).
      binary(kAssignment).
      binary(kPlus).
      binary(kMinus).
      binary(kMultiply).
      binary(kDivide).
      unary(kNot).
      binary(kAnd).
      binary(kOr).
      unary(kMinus).
      binary(kCall).reversePositionalPrecedence().
      binary(kDot).reversePositionalPrecedence().
      finish();
  }),
});
