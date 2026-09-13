import { Helpers, raise, StandardErrorMessage } from '../helpers';
import { Segment, SegmentType } from './segmentation';
import { IastNode } from '../iast_node';
import { Token } from '../token';

const { freeze } = Helpers;

export interface IastBuild_ {
  node(): IastNode | undefined;
  errors(): Readonly<StandardErrorMessage[]>;
};

export type IastBuildConstructor =
  (mTokens: Readonly<Token[]>,
   mSegment: Segment,
   mCtorRetrieval: IastBuildConstructorRetrieval) =>
  IastBuild_;

export interface IastBuildConstructorRetrieval {
  constructorFor(type: SegmentType): IastBuildConstructor;
};

let sInstance: IastBuildConstructorRetrieval | undefined = undefined;

export const IastBuildConstructorRetrieval = freeze({
  initialize(t: IastBuildConstructorRetrieval) {
    if (sInstance)
      { raise('already initialized'); }

    sInstance = t;
  },
  instance(): IastBuildConstructorRetrieval
    { return sInstance ?? raise('called before initialized'); }
});
