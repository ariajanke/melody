// wrap up tokenization:
// - cancellations:
//   - escape + new line
//   - eliminate blank lines
//   - empty string literal + concatenation
//   - concatenation + empty string literal
//   - operator + new line
// - emisisions
//   - call token emission
// - modification
//   - nl identation

import { Helpers, raise } from '../helpers';
import { OperatorNamingSchema } from '../operator_naming_schema';
import { Token, TokenType } from '../token';
import { CharacterClass } from './character_class';

const { freeze, memoize } = Helpers;

function isEscape(tok: Token) {
  return tok.type() === Token.types.operator &&
         tok.content() === CharacterClass.kEscape;
}

interface FinisherState {
  advanceBy(n: number): FinisherState;
  replaceLeft(tok: Token | undefined): FinisherState;
  replaceRight(tok: Token | undefined): FinisherState;
  pushCallEmissionAfter(): FinisherState;
};

interface CompleteFinisherState extends FinisherState {
  index(): number;
  tokens(): (Token | undefined)[];
  callEmissions(): number[];
};

const CompleteFinisherState = freeze({
  make(mTokens: (Token | undefined)[]): CompleteFinisherState {
    let mIdx = 0;
    const mCallEmissionsAfter: number[] = [];
    const inst: CompleteFinisherState = freeze({
      advanceBy(n: number): FinisherState {
        mIdx += n;
        return inst;
      },
      replaceLeft(tok: Token | undefined): FinisherState {
        mTokens[mIdx] = tok;
        return inst;
      },
      replaceRight(tok: Token | undefined): FinisherState {
        mTokens[mIdx + 1] = tok;
        return inst;
      },
      pushCallEmissionAfter(): FinisherState {
        mCallEmissionsAfter.push(mIdx);
        return inst;
      },
      index: () => mIdx,
      tokens: () => mTokens,
      callEmissions: () => mCallEmissionsAfter
    });
    return inst;
  }
})

type AdjacentStepFunction =
  (left: Token, right: Token, state: FinisherState) => FinisherState;

type InnerMap = { [tt in TokenType]: AdjacentStepFunction | undefined };
type OuterMap = { [tt in TokenType]: InnerMap | undefined };
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

const eliminateBoth = (state: FinisherState): FinisherState =>
  state.replaceLeft(undefined).replaceRight(undefined).advanceBy(2);

const lenOfTok = Token.lenOf;

const extendForIndentation = (nl: Token, anything: Token, state: FinisherState): FinisherState => {
  const { start, content, type } = nl;
  const end = anything.start;
  return state.replaceLeft(freeze({ start, end, content, type })).advanceBy(1);
};

const kAdjacentTokensRuleMap: OuterMap = freeze({
  ...kDefaultInner,
  operator: {
    ...kDefaultInner,
    separator(left: Token, _1: Token, state: FinisherState): FinisherState {
      if (!isEscape(left))
        { return state; }

      return eliminateBoth(state);
    }
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
function backOf<T>(arr: Readonly<T[]>): T | undefined {
  return arr[arr.length - 1];
}

export interface TokenFinisher { finishedTokens(): Readonly<Token[]>; };

function make(mTokens: Readonly<Token[]>) {
  const mLen = mTokens.length;
  const finishAdjacencyRules = ((): CompleteFinisherState => {
    const mState = CompleteFinisherState.make(mTokens.slice());
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
        tokens()[index()] ?? raise('index not properly incremented...');
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
