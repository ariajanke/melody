import { Helpers, raise } from '../helpers';
import { Token } from '../token';
import { CharacterClass } from './character_class';
import {
  CrawlerStrategy,
  SourceReader,
} from './crawler_strategy';
import { AdvancedTokenLoopState, TokenLoopState } from './token_loop_state';

const { freeze, memoize } = Helpers;

function make(): CrawlerStrategy {
  const { commonCharacterCodes, isNumeric } = CharacterClass;
  const kNeg = commonCharacterCodes().negative;
  const kDot = commonCharacterCodes().dot;

  function advanceWithToken
    (state: TokenLoopState, start: number, idx: number): AdvancedTokenLoopState
  {
    return state.
      pushToken(start, idx, Token.types.numericLiteral).advanceTo(idx);
  }

  function findNext(source: SourceReader, state: TokenLoopState)
    : AdvancedTokenLoopState
  {
    const start = state.position();
    let idx = start;
    let dotFound = false;

    if (source.codePointAt(start) === kNeg)
      { ++idx; }

    if (!isNumeric(source.codePointAt(idx)))
      { raise('numeric assumption broken'); }

    for (; ; ++idx) {
      const code = source.codePointAt(idx);
      if (code === kDot) {
        if (dotFound)
          { return advanceWithToken(state, start, idx); }

        const nextCode = source.codePointAt(idx + 1);
        if (isNumeric(nextCode)) {
          dotFound = true;
          continue;
        }

        return advanceWithToken(state, start, idx);
      }

      if (!isNumeric(code))
        { return advanceWithToken(state, start, idx); }
    }
  }
  return freeze({ findNext });
}

export const NumericCrawler = freeze({ instance: memoize(make) });
