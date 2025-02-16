import { Helpers } from '../../helpers';

const { freeze } = Helpers;

function construct() {
  let mInsideALet = false;
  const makeSubscriber = (): LetExpressionSubscriber => freeze({
    isInsideLet: () => mInsideALet
  });
  function wrapLet<Type>(value: boolean, fn: () => Type): Type {
    mInsideALet = value;
    const rv = fn();
    mInsideALet = !value;
    return rv;
  }
  return freeze({
    makeSubscriber,
    insideLet : <Type>(fn: () => Type): Type => wrapLet(true , fn),
    outsideLet: <Type>(fn: () => Type): Type => wrapLet(false, fn)
  });
}

export const LetExpressionPublisher  = freeze({ make: construct });
export type  LetExpressionPublisher  = ReturnType<typeof construct>;
export interface LetExpressionSubscriber {
  isInsideLet(): boolean
};
