import { Helpers, raise } from '../helpers';
import { NodeConstructor } from './operator_constructor';

const { freeze } = Helpers;

export interface NodeConstructorCollection {
  at(idx: number): NodeConstructor;
  replace(nc: NodeConstructor): void;
  firstUnreplaced(): NodeConstructor | undefined;
};

function make(mConstructors: NodeConstructor[]): NodeConstructorCollection {
  const mLen = mConstructors.length;
  function at(idx: number): NodeConstructor
    { return mConstructors[idx] ?? raise(`${idx} is out of bounds`); }

  function replace_(idx: number, nc: NodeConstructor): void {
    if (idx >= mLen)
      { raise(`${idx} is out of bounds`); }

    mConstructors[idx] = nc;
  }

  function replace(nc: NodeConstructor): void {
    replace_(nc.lowPosition (), nc);
    replace_(nc.highPosition(), nc);
  }

  // TODO this isn't a complete solution!
  function firstUnreplaced(): NodeConstructor | undefined {
    let idx = 0;
    while (idx < mConstructors.length - 1) {
      const ctor = mConstructors[idx];
      const next = ctor.highPosition();
      if (next <= idx) {
        return ctor;
      }
      idx = next;
    }
    return undefined;
  }

  return freeze({ at, replace, firstUnreplaced });
}

export const NodeConstructorCollection = freeze({ make });
