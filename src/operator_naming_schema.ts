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

import { Helpers, InternalNaming } from './helpers';

const { freeze, makeIsStringInLookUpTable } = Helpers;

const kAnd = 'and';
const kOr = 'or';
const kNot = 'not';
const kIs = 'is';
const kLet = 'let';

const kEquality = '=';
const kMultiply = '*';
const kComma = ',';
const kPlus = '+';
const kMinus = '-';
const kDivide = '/';
const kDot = '.';
const kAssignment = ':=';
const kCall = InternalNaming.mapToInternalName('call');

const kAlphabeticOperators = [
  kLet,
  kAnd,
  kOr,
  kNot,
  kIs
] as const;
const kOperators = [
  ...kAlphabeticOperators,
  kComma,
  kPlus,
  kMinus,
  kDivide,
  kDot,
  kEquality,
  kAssignment,
  kMultiply
] as const;
const kOperatorCharacters = [
  kEquality,
  kMultiply,
  kMinus,
  kComma,
  kPlus,
  kDivide,
  kDot
] as const;

export const OperatorNamingSchema = freeze({
  isAlphabeticOperator: makeIsStringInLookUpTable(kAlphabeticOperators),
  isOperator: makeIsStringInLookUpTable(kOperators),
  kOperatorCharacters,

  kLet,
  kAnd,
  kOr,
  kNot,
  kIs,

  kComma,
  kPlus,
  kMinus,
  kDivide,
  kDot,
  kEquality,
  kAssignment,
  kMultiply,

  kCall,
});
