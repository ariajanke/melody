import { Helpers } from '../helpers';
import { Token } from '../token';
import { CharacterClass } from './character_class';
import {
  StrategyPatch,
  TokenLoopState
} from './token_loop_state';

const { freeze } = Helpers;

export interface StringCrawlListener {
  assumedStartingCharacter(): number;
  onEntry(state: TokenLoopState, start: number): TokenLoopState;
  onExit (state: TokenLoopState): TokenLoopState;
  onClose(state: TokenLoopState): TokenLoopState;
};

export const StringCrawlListener = freeze({
  makeInitialEntry(patchExit: () => StrategyPatch): StringCrawlListener {
    const kSingleQuote = CharacterClass.commonCharacterCodes().singleQuote;
    return freeze({
      assumedStartingCharacter: () => kSingleQuote,
      onEntry(state: TokenLoopState, _1: number): TokenLoopState
        { return state; },
      onExit(state: TokenLoopState): TokenLoopState
        { return state.pushStrategyPatch(patchExit()); },
      onClose(state: TokenLoopState): TokenLoopState
        { return state; }
    });
  },
  makeReentry(popClose: () => StrategyPatch): StringCrawlListener {
    const kConcatenation = Token.types.concatenation;
    const kCurlClose = CharacterClass.commonCharacterCodes().curlClose;
    return freeze({
      assumedStartingCharacter: () => kCurlClose,
      onEntry(state: TokenLoopState, start: number): TokenLoopState
        { return state.pushToken(state.position(), start, kConcatenation); },
      onExit(state: TokenLoopState): TokenLoopState
        { return state; },
      onClose(state: TokenLoopState): TokenLoopState
        { return state.popStrategyPatch(popClose()); }
    });
  }
});
