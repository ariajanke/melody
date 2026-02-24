import { DastBuildVisitor } from './dast_build/dast_build_visitor';
import { DastNode_ } from './dast_build/dast_node';
import { DastVisitor_ } from './dast_build/dast_visitor';
import { Helpers, StandardErrorMessage } from './helpers';
import { IastNode } from './iast_node';

const { freeze, memoize } = Helpers;

export type DastNode = DastNode_;
export type DastVisitor<ResultType = void> = DastVisitor_<ResultType>;
export const DastVisitor = DastVisitor_;

interface DastLetDeclarationBase {
  operator: string;
  dependeeNames: readonly string[];
  value: DastNode;
};

export interface DastLetDeclarationSingle extends DastLetDeclarationBase {
  name: string;
};

export interface DastLetDeclarationMany extends DastLetDeclarationBase {
  names: readonly string[];
};

export type DastLetDeclaration =
  DastLetDeclarationSingle | DastLetDeclarationMany;
export type DastLetDeclarations = readonly DastLetDeclaration[];

export interface ReseatableDastVisitor extends DastVisitor_<void> {
  setInstRef(newInst: ReseatableDastVisitor): ReseatableDastVisitor
};

export interface DastBuild {
  node(): DastNode | undefined;
  error(): StandardErrorMessage;
}

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
