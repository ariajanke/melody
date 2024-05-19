import { Helpers } from './helpers';
import { Token } from './token';
import { TokenCollection } from './tokenization';

export const TokenCrawler = (() => {
  const { freeze } = Object;
  const { memoize } = Helpers

  function make
    (mTokens: TokenCollection,
     mStart: number,
     mEnd: number,
     mIsTarget: (possibleTarget: string) => boolean)
  {
    if (mEnd <= mStart || mEnd > mTokens.count()) {
      throw Error('');
    }

    let mErrorsFn: (() => { message: string }) | (() => undefined) =
      () => undefined;

    function errorOutUnbalanced(tokenDesc: string) {
      mErrorsFn = memoize(() => freeze({ message: `unbalanced ${tokenDesc}` }));
      return undefined;
    }

    function crawl() {
      for (let i = mStart; i < mEnd; ++i) {
        let parenCount = 0;
        let curlyCount = 0;
        const currentToken = mTokens.at(i);
        const tokenContent = currentToken.content();
        switch (tokenContent) {
        case '(': ++parenCount; break;
        case ')':
          if (curlyCount !== 0) {
            return errorOutUnbalanced('curly braces');
          }
          --parenCount;
          break;
        case '{': ++curlyCount; break;
        case '}':
          if (parenCount !== 0) {
            return errorOutUnbalanced('parentheses');
          }
          --curlyCount;
          break;
        default:

          break;
        }
        if (parenCount !== 0 && curlyCount !== 0) {
          continue;
        } else if (mIsTarget(tokenContent)) {
          return i;
        }
      }

      return mEnd;
    }

    const stoppedAt = memoize(crawl);

    return freeze({ stoppedAt, error: () => mErrorsFn() });
  }

  return freeze({ make });
})();
