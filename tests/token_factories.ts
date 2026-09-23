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

import { GroupingNamingSchema } from '../src/grouping_naming_schema';
import { Helpers, raise } from '../src/helpers';
import { OperatorNamingSchema } from '../src/operator_naming_schema';
import { Token } from '../src/token';

const { freeze } = Helpers;

function stripQuotes(s: string): string | undefined {
  if (s[0] === '\'' && s.endsWith('\''))
    { return s.slice(1, s.length - 1); }

  return undefined;
}

function makeFromStringOnly(s: string): Token {
  const asStr = stripQuotes(s);
  const type_ = (() => {
    if (asStr)
      { return Token.types.literal.string; }

    if (!isNaN(parseFloat(s)))
      { return Token.types.literal.numeric; }

    if (GroupingNamingSchema.isClosing(s))
      { return Token.types.grouping.closing; }

    if (GroupingNamingSchema.isOpening(s))
      { return Token.types.grouping.opening; }

    if (s[0] === '\n')
      { return Token.types.grouping.separator; }

    if (OperatorNamingSchema.isOperator(s) ||
        s === OperatorNamingSchema.kCall)
      { return Token.types.operator; }

    return Token.types.identifier;
  })();
  const pos = (): number => raise('uh oh');

  return freeze({
    content: () => asStr ?? s,
    start  : pos,
    end    : pos,
    type   : () => type_
  });
}

function stringsIntoTokens(strings: Readonly<string[]>): Readonly<Token[]> {
  return strings.map(makeFromStringOnly);
}

export const TokenFactories = freeze({ makeFromStringOnly, stringsIntoTokens });
