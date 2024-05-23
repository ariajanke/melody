const { freeze } = Object;

const TokenType = Object.freeze({
  declareFunction: Symbol(),
  operator: Symbol(),
  stringLiteral: Symbol(),
  newLine: Symbol(),
  identifier: Symbol()
});

export interface Token {
  type: () => symbol,
  content: () => string
  start: () => number,
  end: () => number
}

export const Token = (() => {
  function unimplemented<Type>(desc: string): () => Type {
    return (): Type => {
      throw Error(`Cannot call ${desc} unimplemented`);
    };
  }
  const kBlankToken: Token = freeze({
    type: unimplemented<symbol>('type'),
    // TODO: try to get rid of this hack, blank token should
    // never be used
    content: () => '',//unimplemented<string>('content'),
    start: unimplemented<number>('start'),
    end: unimplemented<number>('end')
  });

  function identifyNonKeyword(token: string): symbol {
    const firstChar = token[0];
    switch (firstChar) {
    case '\'': return TokenType.stringLiteral;
    case '\n': return TokenType.newLine;
    // not fool-proof, just some protection
    case ' ': case '\t': case '\r':
      throw Error('cannot build token from whitespace');
    }
    return TokenType.identifier;
  }

  const controlSeqs = {
    ['let']: TokenType.operator,
    ['fn' ]: TokenType.declareFunction,
    ['{'  ]: TokenType.operator,
    ['}'  ]: TokenType.operator,
    ['('  ]: TokenType.operator,
    [')'  ]: TokenType.operator,
    [','  ]: TokenType.operator,
    [':=' ]: TokenType.operator
  };

  function makeFromStringOnly(mContents: string) {
    return construct(mContents, 0, 0);
  }

  function make(mInput: string, mStart: number, mEnd: number): Token {
    return construct(mInput.substring(mStart, mEnd), mStart, mEnd);
  }

  function construct(mTokenContent: string, mStart: number, mEnd: number): Token {
    const mType =
      controlSeqs[mTokenContent] ?? identifyNonKeyword(mTokenContent);
    function content(): string { return mTokenContent; }
    function start(): number { return mStart; }
    function end(): number { return mEnd; }
    function type(): symbol { return mType; }

    return freeze({ content, start, end, type });
  }

  return freeze({
    make,
    types: TokenType,
    kBlankToken,
    forTesting: { makeFromStringOnly }
  });
})();
