import { GroupingNamingSchema } from './grouping_naming_schema';
import { Helpers } from './helpers';
import { OperatorNamingSchema } from './operator_naming_schema';

const { freeze, memoize, toNamedMap } = Helpers;

type LiteralType = 'string' | 'number' | 'hash';

const tokenTypes = [
  // TODO deprecate, remove pending IAST refactor
  // 'functionDefinition', // lose
  //      following remain okay
  'operator'          , // kept
  // 'newLine'           , // lose
  // 'grouping'          , // lose
  'opening', // fn, tbl, (
  'closing', // ~, )
  'separator', // \n
  'identifier'        , // kept
  'literal'           , // new (need sub types then)
  // 'stringLiteral'     , // lose
  // 'numericLiteral'    , // lose
  // 'hashLiteral'       , // lose
  // 'concatenation'       // lose
] as const;

interface TokenTypeFragment {
  type   (): TokenType;
  literal(): LiteralType | undefined;
};

export type TokenType = typeof tokenTypes[number];

const nonLiteraltokenTypes_ = memoize(():
  Readonly<{ [tt in TokenType]: TokenTypeFragment | undefined }> =>
freeze({
  operator: freeze({
    type   : () => 'operator',
    literal: () => undefined
  }),
  opening: freeze({
    type   : () => 'opening',
    literal: () => undefined
  }),
  closing: freeze({
    type   : () => 'closing',
    literal: () => undefined
  }),
  separator: freeze({
    type   : () => 'separator',
    literal: () => undefined
  }),
  identifier: freeze({
    type   : () => 'identifier',
    literal: () => undefined
  }),
  literal: undefined
}));

export interface Token {
  type   (): TokenType;
  content(): string;
  start  (): number;
  end    (): number;
};

const types = toNamedMap(tokenTypes);

function makeCallAfter(lastToken: Token): Token {
  const lastEnd = lastToken.end;
  return freeze({
    type: (): TokenType => 'operator',
    content: () => OperatorNamingSchema.kCall,
    start: lastEnd,
    end: lastEnd
  });
}

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

    if (GroupingNamingSchema.isGrouping(content()))
      { return types.grouping; }

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
  types,
  makeCallAfter,
  makeAlphaNumeric
});
