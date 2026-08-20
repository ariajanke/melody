import { GroupingNamingSchema } from './grouping_naming_schema';
import { Helpers } from './helpers';
import { OperatorNamingSchema } from './operator_naming_schema';

const { freeze, memoize, toNamedMap } = Helpers;

const tokenTypes = [
  // TODO deprecate, remove pending IAST refactor
  'functionDefinition', // lose
  //      following remain okay
  'operator'          , // kept
  'newLine'           , // lose
  'grouping'          , // lose
  // 'opening'
  // 'closing'
  // 'separator'
  'identifier'        , // kept
  // 'literal'           , new
  'stringLiteral'     , // lose
  'numericLiteral'    , // lose
  'hashLiteral'       , // lose
  'concatenation'       // lose
] as const;

export type TokenType = typeof tokenTypes[number];

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
