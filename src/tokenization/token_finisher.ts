/* Melody WASM Compiler
 *
 * Copyright (C) 2026 Aria Janke
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import { Helpers, raise } from '../helpers';
import { OperatorNamingSchema } from '../operator_naming_schema';
import { Token, TokenType } from '../token';
import { CharacterClass } from './character_class';
import { FinisherState, FinisherStateWithData } from './finisher_state';

const { freeze, memoize } = Helpers;

function isEscape(tok: Token) {
  return tok.type() === Token.types.operator &&
         tok.content() === CharacterClass.kEscape;
}

type AdjacentStepFunction =
  (left: Token, right: Token, state: FinisherState) => FinisherState;

type InnerMap = { [tt in TokenType]: AdjacentStepFunction | undefined };
type OuterMap = { [tt in TokenType]: InnerMap | undefined };

const eliminateBoth = (state: FinisherState): FinisherState =>
  state.replaceLeft(undefined).replaceRight(undefined).advanceBy(2);

const lenOfTok = Token.lenOf;

function extendForIndentation
  (nl: Token, anything: Token, state: FinisherState): FinisherState
{
  const { start, type } = nl;
  const content = memoize(() =>
    CharacterClass.kNewLine + ' '.repeat(anything.start() - nl.end()));
  const end = anything.start;
  return state.replaceLeft(freeze({ start, end, content, type })).advanceBy(1);
};

function eliminateIfEscape
  (op: Token, _1: Token, state: FinisherState): FinisherState
{
  if (op.content() !== CharacterClass.kEscape)
    { return state.advanceBy(1); }

  return state.replaceLeft(undefined).advanceBy(1);
}

const kDefaultInner: { [tt in TokenType]: undefined } = {
  opening: undefined,
  closing: undefined,
  separator: undefined,
  string: undefined,
  numeric: undefined,
  hash: undefined,
  operator: undefined,
  concatenation: undefined,
  identifier: undefined
};

const kAdjacentTokensRuleMap: OuterMap = freeze({
  ...kDefaultInner,
  operator: {
    separator(left: Token, _1: Token, state: FinisherState): FinisherState {
      if (!isEscape(left))
        { return state; }

      return eliminateBoth(state);
    },
    opening: eliminateIfEscape,
    closing: eliminateIfEscape,
    string: eliminateIfEscape,
    numeric: eliminateIfEscape,
    hash: eliminateIfEscape,
    operator: eliminateIfEscape,
    concatenation: eliminateIfEscape,
    identifier: eliminateIfEscape
  },
  separator: {
    separator(_0: Token, _1: Token, state: FinisherState): FinisherState {
      return state.replaceLeft(undefined).advanceBy(1);
    },
    opening: extendForIndentation,
    closing: extendForIndentation,
    string: extendForIndentation,
    numeric: extendForIndentation,
    hash: extendForIndentation,
    operator: extendForIndentation,
    concatenation: extendForIndentation,
    identifier: extendForIndentation
  },
  concatenation: {
    ...kDefaultInner,
    string(_0: Token, str: Token, state: FinisherState): FinisherState {
      return lenOfTok(str) === 0 ?
        eliminateBoth(state) :
        state.advanceBy(1);
    }
  },
  string: {
    ...kDefaultInner,
    concatenation(str: Token, _1: Token, state: FinisherState): FinisherState {
      return lenOfTok(str) === 0 ?
        eliminateBoth(state) :
        state.advanceBy(1);
    }
  },
  identifier: {
    ...kDefaultInner,
    opening(idTok: Token, opening: Token, state: FinisherState): FinisherState {
      if (idTok.end() !== opening.start())
        { return state.advanceBy(1); }

      return state.pushCallEmissionAfter().advanceBy(1);
    }
  }
});

// NOTE array maybe empty
function backOf<T>(arr: Readonly<T[]>): T | undefined
  { return arr[arr.length - 1]; }

export interface TokenFinisher { finishedTokens(): Readonly<Token[]>; };

function make(mTokens: Readonly<Token[]>) {
  const mLen = mTokens.length;
  const finishAdjacencyRules = ((): FinisherStateWithData => {
    const mState = FinisherState.make(mTokens.slice());
    const { tokens, index } = mState;
    while (index() < mLen) {
      const oldIdx = index();
      const left = tokens()[index()];
      const right = tokens()[index() + 1];
      if (left === undefined)
        { raise('index not properly incremented'); }

      if (right === undefined)
        { break; }

      const handlerFn =
        (kAdjacentTokensRuleMap[left.type()] ?? kDefaultInner)[right.type()];
      if (handlerFn) {
        handlerFn(left, right, mState);
      } else {
        mState.advanceBy(1);
      }
      if (oldIdx === index()) {
        raise('index not properly incremented...');
      }
    }
    return mState;
  });

  const finishedTokens = memoize((): Readonly<Token[]> => {
    const state = finishAdjacencyRules();
    const finishedTokens: Token[] = [];
    const callEmissionsAfter = state.callEmissions().reverse();
    for (let idx = 0; idx < mLen; ++idx) {
      const tok = state.tokens()[idx];
      if (tok)
        { finishedTokens.push(tok); }
      if (backOf(callEmissionsAfter) === idx) {
        const pos =
          backOf(finishedTokens)?.end ??
          (() => 0);
        finishedTokens.push(freeze({
          start: pos,
          end: pos,
          content: () => OperatorNamingSchema.kCall,
          type: () => Token.types.operator
        }));
        callEmissionsAfter.pop();
      }
    }
    return finishedTokens;
  });

  return freeze({ finishedTokens });
}

export const TokenFinisher = freeze({ make });
