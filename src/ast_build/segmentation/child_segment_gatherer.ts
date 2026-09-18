import { Helpers, raise } from '../../helpers';
import { Segment } from '../segmentation';

const { freeze, memoize } = Helpers;

export interface ChildSegmentGatherer {
  children(): Readonly<Segment[]>;
  pushChild(seg: Segment): ChildSegmentGatherer;
  ensureMutable(): ChildSegmentGatherer;
};

export const ChildSegmentGatherer = freeze({
  defaultEmpty: memoize((): ChildSegmentGatherer => freeze({
    children: memoize((): Readonly<Segment[]> => []),
    pushChild(_0: Segment) { raise('must ensure mutable'); },
    ensureMutable(): ChildSegmentGatherer {
      const mChildren: Segment[] = [];
      const inst: ChildSegmentGatherer = freeze({
        children: () => mChildren,
        pushChild(seg: Segment): ChildSegmentGatherer {
          mChildren.push(seg);
          return inst;
        },
        ensureMutable: () => inst
      });
      return inst;
    }
  }))
});
