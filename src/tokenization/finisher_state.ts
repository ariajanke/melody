import { Helpers } from '../helpers';
import { Token } from '../token';

const { freeze } = Helpers;

export interface FinisherState {
  advanceBy(n: number): FinisherState;
  replaceLeft(tok: Token | undefined): FinisherState;
  replaceRight(tok: Token | undefined): FinisherState;
  pushCallEmissionAfter(): FinisherState;
};

export interface FinisherStateWithData extends FinisherState {
  index(): number;
  tokens(): (Token | undefined)[];
  callEmissions(): number[];
};

export const FinisherState = freeze({
  make(mTokens: (Token | undefined)[]): FinisherStateWithData {
    let mIdx = 0;
    const mCallEmissionsAfter: number[] = [];
    const inst: FinisherStateWithData = freeze({
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
});
