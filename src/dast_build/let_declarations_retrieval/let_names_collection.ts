import { Helpers, StandardError } from '../../helpers';
import { LetNameElement } from '../let_declarations_retrieval';
import { LetNamesSplitter } from './let_names_splitter';

const { freeze, memoize } = Helpers;

function makeEmpty() {
  return freeze({
    elements: () => [],
    error: () => StandardError.make().error(),
  });
} 

function makeErroneous(message: string): LetNamesSplitter {
  return freeze({
    elements: () => undefined,
    error: () => freeze({ message }),
  });
}

function construct(mInst: LetNamesSplitter) {
  return freeze({
    elements: memoize((): Readonly<LetNameElement[]> | undefined => {
      const els = mInst.elements();
      if (!els) return undefined;
      return els;
    }),
    error: mInst.error
  });
}

export type LetNamesCollection = ReturnType<typeof construct>;
export const LetNamesCollection = freeze({
  makeEmpty: memoize(makeEmpty),
  makeErroneous,
  make: construct
});
