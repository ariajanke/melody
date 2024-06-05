// unused??
import { Helpers } from './helpers';
import { TokenRange } from './token_range';

export const TokenCrawler = (() => {
  const { memoize, freeze } = Helpers;

  function make
    (mTokenRange: TokenRange,
     mIsTarget: (possibleTarget: string) => boolean)
  {
    let mErrorsFn: (() => { message: string }) | (() => undefined) =
      () => undefined;

    function errorOutUnbalanced(tokenDesc: string) {
      mErrorsFn = memoize(() => freeze({ message: `unbalanced ${tokenDesc}` }));
      return undefined;
    }

    function crawl(): number | undefined {
      const [start, end] = [mTokenRange.start(), mTokenRange.end()];
      for (let i = start; i < end; ++i) {
        let parenCount = 0;
        let curlyCount = 0;
        const currentToken = mTokenRange.tokenAt(i);
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

      return end;
    }

    const stoppedAt = memoize(crawl);

    return freeze({ stoppedAt, error: () => mErrorsFn() });
  }

  return freeze({ make });
})();
