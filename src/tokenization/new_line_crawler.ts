import { Helpers, raise } from '../helpers';
import { Token } from '../token';
import { CharacterClass } from './character_class';
import {
  CrawlerStrategy,
  SourceReader,
} from './crawler_strategy';
import { AdvancedTokenLoopState, TokenLoopState } from './token_loop_state';

const { freeze, memoize } = Helpers;
const kNewLineType = Token.types.grouping.separator;

function make(): CrawlerStrategy {
  const kNlCode = CharacterClass.commonCharacterCodes().newLine;

  const firstNonNl = (source: SourceReader, idx: number): number | undefined => {
    const code = source.codePointAt(idx);
    if (code === undefined)
      { return code; }

    if (code !== kNlCode)
      { return idx; }
  
    return firstNonNl(source, idx + 1);
  };

  const findNext =
    (source: SourceReader, state: TokenLoopState): AdvancedTokenLoopState =>
  {
    const { position } = state;
    if (source.codePointAt(position()) !== kNlCode)
      { raise('assumptions broken'); }

    const pos = firstNonNl(source, position());
    if (!pos)
      { return state.advanceTo(position() + 1); }

    return state.pushToken(pos - 1, pos, kNewLineType).advanceTo(pos);
  };

  return freeze({ findNext });
}

export const NewLineCrawler = freeze({ instance: memoize(make) });
