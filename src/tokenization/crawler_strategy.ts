import { Helpers } from '../helpers';
import { CharacterClass } from './character_class';
import { type AdvancedTokenLoopState, type TokenLoopState } from './token_loop_state';

const { freeze } = Helpers;

export interface SourceReader {
  codePointAt(i: number): number | undefined;
  strategyFor(position: number): CrawlerStrategy;
};

export interface CrawlerStrategy {
  findNext(source: SourceReader, state: TokenLoopState): AdvancedTokenLoopState;
};

function nextNonEscapedIdx(source: SourceReader, idx: number): number {
  const kEscape = CharacterClass.commonCharacterCodes().escape;
  const code = source.codePointAt(idx);
  if (code === kEscape && source.codePointAt(idx + 1) !== undefined) {
    return idx + 2;
  }
  return idx + 1;
}

export const CrawlerStrategy = freeze({ nextNonEscapedIdx });
