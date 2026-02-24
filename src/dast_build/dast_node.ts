import { DastNode } from '../dast_build';
import { Helpers } from '../helpers';
import { DastVisitor_ } from './dast_visitor';

const { freeze, memoize, makeCounter } = Helpers;

export const DastNodeBase = ((): Readonly<{ make: () => DastNode }> => {
  const counter = makeCounter();
  const asStringDefault = (): string | undefined => undefined;
  function visit<T>(_0: DastVisitor_<T>): T
    { throw new Error('must implement visit'); }
  return freeze({
    make(): DastNode {
      return freeze({
        asString: asStringDefault,
        uid: memoize(counter),
        visit
      });
    }
  });
})();

export interface DastNode_ {
  visit<ResultType = void>(visitor: DastVisitor_<ResultType>): ResultType;
  asString(): string | undefined;
  uid(): number;
};

export const DastNode_ = freeze({
  makeFringe: (v: string): DastNode =>
    freeze({
      ...DastNodeBase.make(),
      asString: () => v,
      visit: <T>(visitor: DastVisitor_<T>): T =>
        visitor.visitFringe(v)
    }),
  makeString: (v: string): DastNode =>
    freeze({
      ...DastNodeBase.make(),
      asString: () => v,
      visit: <T>(visitor: DastVisitor_<T>): T =>
        visitor.visitString(v)
    }),
  makeInteger: (v: string): DastNode =>
    freeze({
      ...DastNodeBase.make(),
      asString: () => v,
      visit: <T>(visitor: DastVisitor_<T>): T =>
        visitor.visitInteger(v)
    })
});
