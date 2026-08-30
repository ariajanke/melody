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
  isLiteral
});
