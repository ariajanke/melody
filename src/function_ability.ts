import { Helpers } from './helpers';

const { freeze, memoize } = Helpers;

export interface FunctionAbility {
  intersectWithSymbol(sym: symbol): FunctionAbility
  intersectWith(ability: FunctionAbility): FunctionAbility
  evaluatedNow(): boolean
};

function makeIsLaterKnown(): FunctionAbility {
  const mUid = Symbol();
  const inst = freeze({
    intersectWith: (ability: FunctionAbility) =>
      ability.intersectWithSymbol(mUid),
    intersectWithSymbol: (_0: symbol) => inst,
    evaluatedNow: () => false
  });
  return inst;
}

function makeIsEvaluatable() {
  const mUid = Symbol();
  const inst = freeze({
    intersectWith: (ability: FunctionAbility) =>
      ability.intersectWithSymbol(mUid),
    intersectWithSymbol: (uid: symbol) => {
      if (mUid === uid)
        { return inst; }
      return class_.isKnownableLater();
    },
    evaluatedNow: () => true
  });
  return inst;
}

function reductionOf(...abilities: Readonly<FunctionAbility[]>) {
  return abilities.reduce((prev: FunctionAbility, cur: FunctionAbility) =>
    prev.intersectWith(cur),
    class_.isEvaluatableNow());
}

const class_ = freeze({
  isEvaluatableNow: memoize(makeIsEvaluatable),
  isKnownableLater: memoize(makeIsLaterKnown ),
  reductionOf
});

export const FunctionAbility = class_;
