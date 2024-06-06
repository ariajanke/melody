import { CharacterCrawler } from './tokenization/character_crawler';
import { Helpers } from './helpers';
import { Token } from './token';
import { TokenRange } from './token_range';

export interface Tokenization {
  tokenize: (input: string) => TokenRange
}

export const Tokenization = (() => {
  const { freeze } = Helpers;

  const injections = freeze({ CharacterCrawler, TokenRange });

  function make
    ({ CharacterCrawler, TokenRange } = injections)
  {
    function tokenize(inp: string): TokenRange {
      const rv: Token[] = [];
      const crawler = CharacterCrawler.make(inp);
      while (!crawler.reachedEnd()) {
        const readToken = crawler.crawl().readToken();
        rv.push(readToken);
      }
      return TokenRange.makeStartingRange(rv);
    }

    return freeze({ tokenize });
  }

  return freeze({ make });
})();
