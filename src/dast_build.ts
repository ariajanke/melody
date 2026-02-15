import { DastBuildVisitor } from './dast_build/dast_build_visitor';
import { DastNode_ } from './dast_build/dast_node';
import { DastVisitor_ } from './dast_build/dast_visitor';
import { Helpers, StandardErrorMessage } from './helpers';
import { IastNode } from './iast_node';

const { freeze, memoize } = Helpers;

export type DastNode = DastNode_;
export type DastVisitor<ResultType = void> = DastVisitor_<ResultType>;
export const DastVisitor = DastVisitor_;

interface DastLetDeclationBase {
  operator: string;
  dependeeNames: readonly string[];
  value: DastNode;
};

export interface DastLetDeclationSingle extends DastLetDeclationBase {
  name: string;
};

export interface DastLetDeclationMany extends DastLetDeclationBase {
  names: readonly string[];
};

export type DastLetDeclation = DastLetDeclationSingle | DastLetDeclationMany;
export type DastLetDeclations = readonly DastLetDeclation[];

export interface ReseatableDastVisitor extends DastVisitor_<void> {
  setInstRef(newInst: ReseatableDastVisitor): ReseatableDastVisitor
};

export interface DastBuild {
  node(): DastNode | undefined;
  error(): StandardErrorMessage;
}

export interface MergeableDastBuild extends DastBuild {
  mergeWith(build: DastBuild): MergeableDastBuild;
};

export const DastBuild = freeze({
  make(root: IastNode) {
    const mVisitor = DastBuildVisitor.make();
    const build = memoize((): DastBuild => root.visit(mVisitor));

    return freeze({
      node: () => build().node(),
      error: () => build().error()
    });
  }
});
