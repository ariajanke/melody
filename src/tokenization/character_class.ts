import { GroupingNamingSchema } from '../grouping_naming_schema';
import { Helpers } from  '../helpers';
import { OperatorNamingSchema } from '../operator_naming_schema';

export type CharacterClassName =
  'alphabetic' |
  'hash' |
  'negative' |
  'newLine' |
  'numeric' |
  'operative' |
  'whitespace' |
  'stringLiteral' |
  'grouping' |
  'identifierLiteral' |
  'escape';
type ExtendedCharacterClassName = CharacterClassName | 'special';
type MutCodeMap = { [charCode: number]: ExtendedCharacterClassName | undefined };
type CodeMap = Readonly<MutCodeMap>;

const { freeze, memoize } = Helpers;

const kNewLine = '\n';
const kNegative = OperatorNamingSchema.kMinus;
const kHash = '#';
const kSingleQuote = '\'';
const kCurlOpen = '{';
const kCurlClose = '}';
const kEscape =  '\\';
const kDollar = '$';
const kColon = ':';
const kNumericCharacters =
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const;
const kWhitespace = [' ', '\t', '\r'] as const;
const kOperativeCharacters = [
  ...OperatorNamingSchema.kOperatorCharacters.filter(v => v !== kNegative),
  kColon
] as const;
const kSpecial = [kCurlClose, kCurlOpen] as const;

function intoLookUpMap
  (charClass: ExtendedCharacterClassName, charStrings: Readonly<string[]>)
: CodeMap
{
  return freeze(charStrings.reduce((prev: MutCodeMap, char: string) => {
    prev[char.codePointAt(0) as number] = charClass;
    return prev;
  }, {} as MutCodeMap));
}

const numericCodes = memoize((): CodeMap =>
  intoLookUpMap('numeric', kNumericCharacters));

const whitespaceCodes = memoize((): CodeMap =>
  intoLookUpMap('whitespace', kWhitespace));

const fullCodeMap = memoize((): CodeMap => freeze({
  ...intoLookUpMap('hash', [kHash]),
  ...intoLookUpMap('negative', [kNegative]),
  ...intoLookUpMap('newLine', [kNewLine]),
  ...numericCodes(),
  ...intoLookUpMap('operative', kOperativeCharacters),
  ...whitespaceCodes(),
  ...intoLookUpMap('stringLiteral', [kSingleQuote]),
  ...intoLookUpMap('special', kSpecial),
  ...intoLookUpMap('grouping', GroupingNamingSchema.kGroupingCharacters),
  ...intoLookUpMap('identifierLiteral', [kDollar]),
  ...intoLookUpMap('escape', [kEscape])
}));

const commonCharacterCodes = memoize(() => {
  const asCode = (s: string) => s.codePointAt(0) as number;

  return freeze({
    colon      : asCode(kColon),
    equality   : asCode(OperatorNamingSchema.kEquality),
    newLine    : asCode(kNewLine),
    curlOpen   : asCode(kCurlOpen),
    curlClose  : asCode(kCurlClose),
    negative   : asCode(kNegative),
    dot        : asCode(OperatorNamingSchema.kDot),
    escape     : asCode(kEscape),
    hash       : asCode(kHash),
    singleQuote: asCode(kSingleQuote),
    dollar     : asCode(kDollar),
    tilde      : asCode(GroupingNamingSchema.kBodyClose)
  });
});

const isNumeric = (code: number | undefined): boolean =>
  (code && numericCodes()[code]) !== undefined;

const isWhitespace = (code: number | undefined): boolean =>
  (code && whitespaceCodes()[code]) !== undefined;

const isAlphabetic = (code: number | undefined) => {
  if (code === undefined)
    { return false; }

  return fullCodeMap()[code] === undefined;
};

function classOfCharacter(charCode: number | undefined): CharacterClassName | undefined {
  if (!charCode)
    { return undefined; }

  const class_ = fullCodeMap()[charCode];
  if (class_ === 'special')
    { return undefined; }

  return class_ ?? 'alphabetic';
}

export const CharacterClass = freeze({
  kEscape,
  kNewLine,
  commonCharacterCodes,
  isNumeric,
  isAlphabetic,
  isWhitespace,
  classOfCharacter
});
