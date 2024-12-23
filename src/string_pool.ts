import { AstNode } from './ast_node';
import { AstStringLiteralNode } from './ast_string_literal_node';
import { Helpers } from './helpers';
import { StringType } from './string_type';

const { memoize, freeze } = Helpers;

export type StringPool = {
  lookUp(str: string): number | undefined
  reverseLookUp(n: number): string | undefined
  askString(): number
};

export const StringPool = freeze({  
  makeDefault: memoize((): StringPool => {
    const node = AstStringLiteralNode.make('bees');
    return StringPool.make(node);
  }),
  makeForStrings(getStrings: () => string[]) {
    const stringsArray = memoize(getStrings);
    const reversePoolLookUp = memoize(() => {
      const revmap = stringsArray().
        map((val: string, idx: number) => ({ [val]: idx }));
      return Object.assign({}, ...revmap) as { [name: string]: number | undefined };
    });
    let mAskRot = 0;
    return freeze({
      lookUp: (str: string) =>
        reversePoolLookUp()[str],
      reverseLookUp: (n: number) =>
        stringsArray()[n],
      askString() {
        const rv = mAskRot;
        mAskRot = (mAskRot + 1) % stringsArray().length;
        return rv;
      }
    });
  },
  make(rootNode: AstNode): StringPool {
    return StringPool.makeForStrings(() => rootNode.
      visit( StringType.stringPoolVisitor() ));
  }
});
