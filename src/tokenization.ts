import { CharacterCrawler } from './character_crawler';
import { Token } from './token';

export interface TokenCollection {
  count: () => number,
  // typeAt: (i: number) => symbol,
  // tokenAt: (i: number) => string,
  at: (i: number) => Token
  forEach: (fn: (token: string) => void) => void
}

export interface Tokenization {
  tokenize: (input: string) => TokenCollection
}

const { freeze } = Object

export const TokenCollection = (() => {
  function verifyNoTwoContiguousNewLineTokens(mTokens: Token[]) {
    const { length } = mTokens;
    if (length < 2) return;
    for (let i = 1; i < length; ++i) {
      if (mTokens[i    ].type() === Token.types.newLine &&
          mTokens[i - 1].type() === Token.types.newLine)
      {
        throw Error(`Contiguous new lines not allowed near element ${i}`);
      }
    }
  }

  function make(mTokens: Token[]): TokenCollection {
    let mLength = mTokens.length;
    verifyNoTwoContiguousNewLineTokens(mTokens);

    function count(): number {
      return mLength;
    }

    function at(i: number): Token {
      return mTokens[i];
    }

    function forEach(fn: (token: string) => void): void {
      mTokens.forEach((token: Token) => fn(token.content()));
    }

    return freeze({ count, at, forEach });
  }

  return freeze({ make });
})();

export const Tokenization = (() => {

  const injections = freeze({ CharacterCrawler });

  function make({ CharacterCrawler } = injections) {
    function tokenize(inp: string): TokenCollection {
      const rv: Token[] = [];
      const crawler = CharacterCrawler.make(inp);
      while (!crawler.reachedEnd()) {
        const readToken = crawler.crawl().readToken();
        rv.push(readToken);
      }
      return TokenCollection.make(rv);
    }

    return freeze({ tokenize });
  }

  return freeze({ make });
})();

window['Tokenization'] = Tokenization;
