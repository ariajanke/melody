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

import { GroupingNamingSchema } from './grouping_naming_schema';
import { Helpers } from './helpers';
import { OperatorNamingSchema } from './operator_naming_schema';

const { freeze, memoize, toNamedMap, makeIsStringInLookUpTable } = Helpers;

const groupings = ['opening', 'closing', 'separator'] as const;
const literals = ['string', 'numeric', 'hash'] as const;
const otherTypes = ['operator', 'concatenation', 'identifier'] as const;

const types = freeze({
  literal: toNamedMap(literals),
  grouping: toNamedMap(groupings),
  ...toNamedMap(otherTypes)
});

export type TokenType =
  typeof groupings[number] | typeof literals[number] | typeof otherTypes[number];

export interface Token {
  type   (): TokenType;
  content(): string;
  start  (): number;
  end    (): number;
};

function makeCallAfter(lastToken: Token): Token {
  const lastEnd = lastToken.end;
  return freeze({
    type: (): TokenType => 'operator',
    content: () => OperatorNamingSchema.kCall,
    start: lastEnd,
    end: lastEnd
  });
}

const isLiteralType = makeIsStringInLookUpTable(literals);

function isLiteral(tok: Token): boolean {
  return isLiteralType(tok.type());
}

const isOperativeType = makeIsStringInLookUpTable([
  'operator', 'concatenation'
] satisfies TokenType[]);

function isOperative(tok: Token): boolean {
  return isOperativeType(tok.type());
}

const lenOf = (tok: Token) => tok.end() - tok.start();

function makeContentFunction
  (mParentString: string,
   mStart: number,
   mEnd: number)
{ return memoize((): string => mParentString.substring(mStart, mEnd)); }

function makeAlphaNumeric
  (mParentString: string,
   mStart: number,
   mEnd: number)
{
  const content = makeContentFunction(mParentString, mStart, mEnd);
  const type = memoize((): TokenType => {
    if (OperatorNamingSchema.isAlphabeticOperator(content()))
      { return types.operator; }

    if (GroupingNamingSchema.isClosing(content()))
      { return types.grouping.closing; }

    if (GroupingNamingSchema.isOpening(content()))
      { return types.grouping.opening; }

    return types.identifier;
  });

  return freeze({
    start: () => mStart,
    end: () => mEnd,
    content,
    type
  });
}

function make
  (mParentString: string,
   mStart: number,
   mEnd: number,
   mType: TokenType): Token
{
  return freeze({
    content: makeContentFunction(mParentString, mStart, mEnd),
    start: (): number => mStart,
    end  : (): number => mEnd,
    type : (): TokenType => mType
  });
}

export const Token = freeze({
  make,
  lenOf,
  types,
  makeCallAfter,
  makeAlphaNumeric,
  isLiteral,
  isOperative
});
