import { Helpers, raise } from '../helpers';
import { NodeConstructor } from './operator_constructor';

const { freeze } = Helpers;

export interface NodeConstructorCollection {
  at(idx: number): NodeConstructor;
  replace(idx: number, nc: NodeConstructor): void;
  firstUnreplaced(): NodeConstructor | undefined;
};

const isFalse = (b: boolean) => b === false;

function make(mConstructors: NodeConstructor[]): NodeConstructorCollection {
  const mReplaced: boolean[] = mConstructors.map(() => false);
  const mLen = mConstructors.length;
  function at(idx: number): NodeConstructor
    { return mConstructors[idx] ?? raise(`${idx} is out of bounds`); }

  function replace(idx: number, nc: NodeConstructor): void {
    if (idx >= mLen)
      { raise(`${idx} is out of bounds`); }

    mReplaced[idx] = true;
    mConstructors[idx] = nc;
  }

  function firstUnreplaced(): NodeConstructor | undefined {
    const idx = mReplaced.findIndex(isFalse);
    if (idx === -1)
      { return undefined; }

    return mConstructors[idx];
  }

  return freeze({ at, replace, firstUnreplaced });
}

export const NodeConstructorCollection = freeze({ make });
