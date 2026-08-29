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

import { GroupingNamingSchema } from '../grouping_naming_schema';
import { Helpers, raise } from '../helpers';
import { Token, TokenType } from '../token';
import { CharacterClass } from './character_class';

const { freeze } = Helpers;

function isEscape(tok: Token | undefined) {
  return tok !== undefined &&
         tok.type() === Token.types.operator &&
         tok.content() === CharacterClass.kEscape;
}

// function isNewLine(tok: Token | undefined) {
//   return tok !== undefined &&
//          tok.type() === Token.types.grouping.separator;
// }

// function isStringLiteral(tok: Token | undefined) {
//   return tok?.type() === Token.types.literal.string;
// }

// function isConcatenation(tok: Token | undefined) {
//   return tok?.type() === Token.types.concatenation;
// }

// function isIdentifier(tok: Token | undefined) {
//   return tok?.type() === Token.types.identifier;
// }

// function isCallOpening(tok: Token | undefined) {
//   return tok?.type() === Token.types.grouping.opening &&
//          tok?.content() === GroupingNamingSchema.kParentheticalOpen;
// }

interface FinisherState {
  advanceBy(n: number): FinisherState;
  replaceLeft(tok: Token | undefined): FinisherState;
  replaceRight(tok: Token | undefined): FinisherState;
  pushCallEmissionAfter(): FinisherState;
};

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

const extendForIndentation = (nl: Token, anything: Token, state: FinisherState): FinisherState => {
  const { start, content, type } = nl;
  const { end } = anything;
  return state.replaceLeft(freeze({ start, end, content, type })).advanceBy(1);
};

const kAdjacentTokensRuleMap: OuterMap = {
  ...kDefaultInner,
  operator: {
    ...kDefaultInner,
    separator(left: Token, _1: Token, state: FinisherState): FinisherState {
      if (isEscape(left)) {
        state.replaceLeft(undefined);
      }
      return state.replaceRight(undefined).advanceBy(1);
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
      return str.content().length === 0 ?
        eliminateBoth(state) :
        state;
    }
  },
  string: {
    ...kDefaultInner,
    concatenation(str: Token, _1: Token, state: FinisherState): FinisherState {
      return str.content().length === 0 ?
        eliminateBoth(state) :
        state;
    }
  },
  identifier: {
    ...kDefaultInner,
    opening(idTok: Token, opening: Token, state: FinisherState): FinisherState {
      if (idTok.end() !== opening.start())
        { return state; }

      return state.pushCallEmissionAfter();
    }
  }
};

function doIt(mTokens: Readonly<Token[]>) {
  const mToks: (Token | undefined)[] = mTokens.slice();
  const mCallEmissionsAfter: number[] = [];
  
  let mIdx = 0;
  let mState: FinisherState = {
    advanceBy(n: number): FinisherState {
      mIdx += n;
      return mState;
    },
    replaceLeft(tok: Token | undefined): FinisherState {
      mToks[mIdx] = tok;
      return mState;
    },
    replaceRight(tok: Token | undefined): FinisherState {
      mToks[mIdx + 1] = tok;
      return mState;
    },
    pushCallEmissionAfter(): FinisherState {
      mCallEmissionsAfter.push(mIdx);
      return mState;
    }
  };

  const len = mToks.length;
  while (idx < len) {
    const left = mToks[idx];
    const right = mToks[idx + 1];
    if (left === undefined)
      { raise('index not properly incremented'); }
    if (right === undefined)
      { break; }

    const handlerFn =
      (kAdjacentTokensRuleMap[left.type()] ?? kDefaultInner)[right.type()];
    if (handlerFn) {
      state = handlerFn(left, right, state);
    } else {
      ++idx;
    }
  }
}