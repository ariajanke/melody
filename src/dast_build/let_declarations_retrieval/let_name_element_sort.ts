import { Helpers } from '../../helpers';
import { LetNameElement } from '../let_declarations_retrieval';

const { freeze } = Helpers;

type ElementSet = { [name: string]: LetNameElement | undefined };

export const LetNameElementSort = freeze({
  sortedElementsFor(mElements: Readonly<LetNameElement[]>) {
    
    function sortedElements() {
      if (mElements.length === 0)
        { return mElements; }  

      const res: LetNameElement[] = [];
      const start = nameGraph();
      const wipeNameOnStart = (name: string) =>
        { start[name] = undefined; };
      const onName = (name: string) => {
        if (!start[name]) {
          return;
        }
        const el = start[name];
        // NOTE do my dependants first
        start[name].dependeeNames.forEach(onName);
        res.push(el);
        if ('name' in el) {
          start[el.name] = undefined;
        } else {
          el.names.forEach(wipeNameOnStart);
        }
      };
      Object.keys(start).forEach(onName);

      return res;
    }

    function nameGraph(): ElementSet {
      const rv: ElementSet = {};
      mElements.forEach((el: LetNameElement) => {
        if ('name' in el) {
          rv[el.name] = el;
        } else {
          el.names.forEach((name: string) => { rv[name] = el; });
        }
      });
      return rv;
    }

    return sortedElements();
  }
});
