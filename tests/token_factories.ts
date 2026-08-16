import { GroupingNamingSchema } from '../src/grouping_naming_schema';
import { Helpers, raise } from '../src/helpers';
import { OperatorNamingSchema } from '../src/operator_naming_schema';
import { Token } from '../src/token';

const { freeze } = Helpers;

function stripQuotes(s: string): string | undefined {
  if (s[0] === '\'' && s.endsWith('\''))
    { return s.slice(1, s.length - 2); }

  return undefined;
}

function makeFromStringOnly(s: string): Token {
  const asStr = stripQuotes(s);
  const type_ = (() => {
    if (asStr)
      { return Token.types.stringLiteral; }

    if (!isNaN(parseFloat(s)))
      { return Token.types.numericLiteral; }

    if (GroupingNamingSchema.isGrouping(s))
      { return Token.types.grouping; }

    if (s === '\n')
      { return Token.types.newLine; }

    if (OperatorNamingSchema.isOperator(s))
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

export const TokenFactories = freeze({ makeFromStringOnly });
