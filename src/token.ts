import { Tokenization } from "./tokenization";

const { freeze } = Object;

export interface Token {
  type   : () => symbol,
  content: () => string
  start  : () => number,
  end    : () => number
}

export const Token = (() => {
  const types = freeze({
    // declareFunction: Symbol(), // ???
    operator       : Symbol(),
    newLine        : Symbol(),
    grouping       : Symbol(),
    identifier     : Symbol(),
    stringLiteral  : Symbol(),
    integerLiteral : Symbol(),
  });

  const kBlankToken: Token = (() => {
    function unimplemented<Type>(desc: string): () => Type {
      return (): Type => {
        throw Error(`Cannot call ${desc} unimplemented`);
      };
    }

    return freeze({
      type   : unimplemented<symbol>('type'),
      // TODO: try to get rid of this hack, blank token should
      // never be used
      content: () => '',
      start  : unimplemented<number>('start'),
      end    : unimplemented<number>('end'  )
    });
  })();

  const tokenTypeOf = (() => {
    const kControlSeqs = freeze({
      ['let']: types.operator,
      // ['fn' ]: types.declareFunction,
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
    let mType: symbol | undefined = undefined;
    return freeze({
      content: (): string => mTokenContent,
      start  : (): number => mStart,
      end    : (): number => mEnd,
      type   : (): symbol => mType ??= tokenTypeOf(mTokenContent)
    });
  }

  return freeze({
    make: (mInput: string, mStart: number, mEnd: number): Token =>
      construct(mInput.substring(mStart, mEnd), mStart, mEnd),
    types,
    kBlankToken,
    forTesting: { makeFromStringOnly }
  });
})();
