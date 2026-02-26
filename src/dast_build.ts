import { DastBuildVisitor } from './dast_build/dast_build_visitor';
import { DastNode_ } from './dast_build/dast_node';
import { DastVisitor_ } from './dast_build/dast_visitor';
import { Helpers, StandardErrorMessage } from './helpers';
import { IastNode } from './iast_node';

const { freeze, memoize } = Helpers;

export type DastNode = DastNode_;
export type DastVisitor<ResultType = void> = DastVisitor_<ResultType>;
export const DastVisitor = DastVisitor_;

export interface DastAttributeDeclaration {
  tupleRank?: number;
  variableName: string;
};

export interface DastLetDeclaration {
  // functionKind: ContextFunctionGroup;

  // it seems that value can't always be here
  // (e.g. for let (a, b) = t)
  // alternatively it's value could be the nth member of some tuple on an initialSet
  value: DastNode;

  // at least one of the following has to be defined

  // there are four possible combinations of declarations:
  
  // let (a, b, ...) = t
  // single initialSet: "<initSet>:(a,b,...)"
  // three accessors: ".a", ".b", ...
  // (possibly) three assignments: "a:=", "b:=", ...
  // three variable names: "a", "b", ...
  // tuple rank would be at play here
  // for "a" its tuple rank is 0
  // tell the context builder to look up tuple type's 0th member type
  // to type deduce "a"

  // let a = t
  // single initialSet: "<initSet>:(a)"
  // single accessor: ".a"
  // (possibly) single assignment: "a:="
  // single variable name: "a"

  // let (a, b, ...) = (x, y, ...)
  // single initialSet: "<initSet>:(a,b,...)"
  // three accessors: ".a", ".b", ...
  // (possibly) three assignments: "a:=", "b:=", ...
  // three variable names: "a", "b", ...

  // let a = (x, y, ...)
  // single initialSet: "<initSet>:(a)"
  // single accessor: ".a"
  // (possibly) single assignment: "a:="
  // single variable name: "a"

  // for each
  // every accessor and assignment has a single variable name
  // in the case of a tupleRank, its type must be deduced at function type build time


  accessor?: DastAttributeDeclaration;
  assignment?: DastAttributeDeclaration;
  
  // fields for initialSet
  initialSet?: {
    variableNames: Readonly<string[]>; // e.g. for <initSet>:(a,b) -> [a, b], for <initSet>:(a) -> [a]
    dependeeNames: Readonly<string[]>;  
  };
};

export type WritableDastDeclarationMap = { [functionName: string]: DastLetDeclaration };
export type DastDeclarationMap = Readonly<WritableDastDeclarationMap>;
export interface DastFunctionNameMappings {
  declaredNames: DastDeclarationMap;
  pendingNames: Readonly<{ [name: string]: true }>;
};

export type DastLetDeclarations = Readonly<DastLetDeclaration[]>;

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
