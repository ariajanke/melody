import { Helpers, raise, StandardErrorMessage } from '../helpers';
import { Segment, SegmentType } from './segmentation';
import { AstNode } from '../ast_node';
import { Token } from '../token';

const { freeze } = Helpers;

export interface AstBuild_ {
  node(): AstNode | undefined;
  errors(): Readonly<StandardErrorMessage[]>;
};

export type AstBuildConstructor =
  (mTokens: Readonly<Token[]>,
   mSegment: Segment,
   mCtorRetrieval: AstBuildConstructorRetrieval) =>
  AstBuild_;

export interface AstBuildConstructorRetrieval {
  constructorFor(type: SegmentType): AstBuildConstructor;
};

let sInstance: AstBuildConstructorRetrieval | undefined = undefined;

export const AstBuildConstructorRetrieval = freeze({
  initialize(t: AstBuildConstructorRetrieval) {
    if (sInstance)
      { raise('already initialized'); }

    sInstance = t;
  },
  instance(): AstBuildConstructorRetrieval
    { return sInstance ?? raise('called before initialized'); }
});
