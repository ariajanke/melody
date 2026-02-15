import { Tokenization } from './tokenization';
import { Helpers } from './helpers';

const { freeze, toNamedMap } = Helpers;

const tokenTypes = [
  'functionDefinition',
  'operator'          ,
  'newLine'           ,
  'grouping'          ,
  'identifier'        ,
  'stringLiteral'     ,
  'integerLiteral'    ,
  'special'
] as const;

export type TokenType = typeof tokenTypes[number];

export interface Token {
  type   : () => TokenType,
  content: () => string
  start  : () => number,
  end    : () => number
}

export const Token = (() => {
  const types = toNamedMap(tokenTypes);
  const specialType = (): TokenType => 'special';
  function unimplemented<Type>(desc: string): () => Type {
    return (): Type => {
      throw Error(`Cannot call ${desc} unimplemented`);
    };
  }

  function makeSpecialToken(content_: string): Token {
    return freeze({
      type   : specialType,
      // TODO: try to get rid of this hack, blank token should
      // never be used
      content: () => content_,
      start  : unimplemented<number>('start'),
      end    : unimplemented<number>('end'  )
    });
  };

  const kBlankToken: Token = makeSpecialToken('');
  const kCallToken : Token = makeSpecialToken('call');
  const kContextToken: Token = makeSpecialToken('<context>');

  const tokenTypeOf = (() => {
    const kControlSeqs: { [sequence: string]: TokenType } = freeze({
      ['let']: types.operator,
      ['fn' ]: types.functionDefinition,
      ['('  ]: types.grouping,
      [')'  ]: types.grouping,
      [','  ]: types.operator,
      ['+'  ]: types.operator,
      ['-'  ]: types.operator,
      ['*'  ]: types.operator,
      [':=' ]: types.operator,
      ['='  ]: types.operator
    });

    return (tokenContent: string, tokenizationClass = Tokenization) =>
      kControlSeqs[tokenContent] ??
      tokenizationClass.tokenTypeOfNonKeyword(tokenContent);
  })();

  function makeFromStringOnly(mContents: string) {
    return construct(mContents, 0, 0);
  }

  function construct
    (mTokenContent: string, mStart: number, mEnd: number): Token
  {
    let mType: TokenType | undefined = undefined;
    return freeze({
      content: (): string => mTokenContent,
      start  : (): number => mStart,
      end    : (): number => mEnd,
      type   : (): TokenType => mType ??= tokenTypeOf(mTokenContent)
    });
  }

  return freeze({
    make: (mInput: string, mStart: number, mEnd: number): Token =>
      construct(mInput.substring(mStart, mEnd), mStart, mEnd),
    types,
    kBlankToken,
    kCallToken,
    kContextToken,
    forTesting: { makeFromStringOnly }
  });
})();
