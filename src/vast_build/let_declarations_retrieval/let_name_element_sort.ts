import { Helpers } from '../../helpers';
import { LetNameElement } from '../let_declarations_retrieval';

const { freeze } = Helpers;

export const LetNameElementSort = freeze({
  sortedElementsFor(mElements: Readonly<LetNameElement[]>) {
    type ElementSet = { [name: string]: LetNameElement | undefined };
    function sortedElements() {
      if (mElements.length === 0)
        { return mElements; }  
      const nameGraph_ = nameGraph();
      const res: LetNameElement[] = [];
      const onName = (name: string) => {
        if (!nameGraph_[name]) {
          return;
        }
        nameGraph_[name].dependeeNames.forEach(onName);
        res.push(nameGraph_[name]);
        nameGraph_[name] = undefined;
      };
      Object.keys(nameGraph_).forEach(onName);
      return res;
    }

    function nameGraph(): ElementSet {
      const rv: ElementSet = {};
      mElements.forEach((el: LetNameElement) => { rv[el.name] = el; });
      return rv;
    }

    return sortedElements();
  }
});
