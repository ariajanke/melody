import { Helpers, raise } from '../helpers';
import { IastNode_, IastVisitor_ } from './iast_types';

const { freeze, makeCounter, memoize } = Helpers;

const kIsATuple = Symbol();

interface IastTuple extends IastNode_ {
  kIsATuple: symbol;
  append(n: IastNode_): void;
  detuplify(): Readonly<IastNode_[]>;
  uid(): number;
};

const nodeAsString = (n: IastNode_) => n.asString();
const counter = makeCounter();

export const IastTuple = freeze({
  tuplify(tOrN1: IastNode_ | IastTuple, n2: IastNode_): IastNode_ {
    if ('kIsATuple' in tOrN1 && tOrN1.kIsATuple === kIsATuple) {
      const temp = tOrN1;
      temp.append(n2);
      return temp;
    } else {
      return IastTuple.make([tOrN1, n2]);
    }
  },
  detuplify(n: IastNode_ | IastTuple): Readonly<IastNode_[]> {
    if ('kIsATuple' in n && n.kIsATuple === kIsATuple) {
      return n.detuplify();
    }
    return [n];
  },
  make(mMembers: IastNode_[] = []): IastTuple {
    function verifyNotSelfNested() {
      for (let i = 0; i < mMembers.length; ++i) {
        const node = mMembers[i];
        if ('kIsATuple' in node && node.kIsATuple === kIsATuple) {
          if ((node as IastTuple).uid() === inst.uid()) {
            raise('must not self nest tuple');
          }
        }
      }
    }
    const inst = freeze({
      kIsATuple,
      detuplify: (): Readonly<IastNode_[]> => mMembers,
      append(n: IastNode_) {
        mMembers.push(n);
        verifyNotSelfNested();
      },
      visit: <T>(visitor: IastVisitor_<T>): T =>
        visitor.visitTuple(mMembers),
      asString: () =>
        `Tuple { ${mMembers.map(nodeAsString).join(', ')} }`,
      uid: memoize(counter)
    });
    verifyNotSelfNested();
    return inst;
  }
});
