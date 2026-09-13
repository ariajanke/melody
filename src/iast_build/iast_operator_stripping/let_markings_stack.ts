import { Helpers, raise } from '../../helpers';

const { freeze } = Helpers;

export interface LetMarkings {
  isOutsideOfLetStatement(): boolean;
};

export interface LetMarkingsStack extends LetMarkings {
  markInsideLetStatement(): void;
  markOutsideLetStatement(): void;
  popMarking(): void;
  assertEmpty(why: string): void;
};

function make(): LetMarkingsStack {
  const mInsideLet: (boolean | undefined)[] = [];

  return freeze({
    markInsideLetStatement(): void {
      mInsideLet.push(true);
    },
    markOutsideLetStatement(): void {
      mInsideLet.push(false);
    },
    popMarking(): void {
      mInsideLet.pop();
    },
    isOutsideOfLetStatement(): boolean
      { return mInsideLet[mInsideLet.length - 1] !== true; },
    assertEmpty(why: string): void {
      if (mInsideLet.length === 0)
        { return; }

      raise(why);
    }
  });
}

export const LetMarkingStack = freeze({ make });
