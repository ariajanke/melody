import { DastBuildVisitor } from './dast_build/dast_build_visitor';
import { DastNode_ } from './dast_build/dast_node';
import { DastVisitor_ } from './dast_build/dast_visitor';
import { Helpers, StandardErrorMessage } from './helpers';
import { IastNode } from './iast_node';

const { freeze, memoize } = Helpers;

export type DastNode = DastNode_;
export type DastVisitor<ResultType = void> = DastVisitor_<ResultType>;
export const DastVisitor = DastVisitor_;

// interface DastLetDeclarationBase {
//   operator: string;
//   dependeeNames: readonly string[];
//   value: DastNode;
// };

// export interface DastLetDeclarationSingle extends DastLetDeclarationBase {
//   name: string;
// };

// export interface DastLetDeclarationMany extends DastLetDeclarationBase {
//   names: readonly string[];
// };

// export type DastLetDeclaration =
//   DastLetDeclarationSingle | DastLetDeclarationMany;
// export interface DastLetDeclaration {
//   functionKind: ContextFunctionGroup;

//   // it seems that value can't always be here
//   // (e.g. for let (a, b) = t)
//   // alternatively it's value could be the nth member of some tuple on an initialSet
//   value: DastNode;
//   tupleRank?: number;

//   variableNames: Readonly<string[]>;
  
//   // defined if functionKind is 'initialSet'
//   dependeeNames?: Readonly<string[]>;  
// };

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

// export interface DastLetDeclarationMap {
//   [functionName: string]: DastLetDeclaration;
// };
// export type DastLetDeclarationMaps = Readonly<DastLetDeclarationMap[]>;
export type WritableDastDeclarationMap = { [functionName: string]: DastLetDeclaration };
export type DastDeclarationMap = Readonly<WritableDastDeclarationMap>;
export interface DastFunctionNameMappings {
  // name can represent a specific function name
  // we've decided the order of these things is important...
  // [name: string]: {
  //   breaksInto?: Readonly<string[]>;
  //   operator: DeclarationOperator;
  //   dependeeNames: Readonly<string[]>;
  //   value: DastNode;
  // } | 'pending';
  // declarations: Readonly<DastLetDeclarationMap>;
  // another thing that maps variable names to their respective functions
  // the goal here is to make context building dead simple

  // (let (a, b, ...) = t) evulates to a tuple
  // (let a = t) evaluates to a fringe
  // (let (a, b, ...) = (x, y, ...)) evaluates to a tuple

  // <initSet>:(a,b,c) ->
  //   

  // declarations: Readonly<{
  //   // var name to

  //   [name: string]:  {
  //     // its function name, e.g. <initSet>:(a) or .a or a:=
      
  //   } 
  // }>;

  declaredNames: DastDeclarationMap;
  pendingNames: Readonly<{ [name: string]: true }>;
};


// // Single declaration
// {
//   functionName: "<initSet>:(a)",
//   operator: "initialSet", // <- tells us which context builder function to call
//   dependeeNames: [".x", ".y"]
// }

// // Multiple declarations
// {
//   functionName: "<initSet>:(a,b)",
//   breaksInto: ["a", "b"], // <- tells us how to compose our initialSet from seperate variable names
//   operator: "initialSet",
//   dependeeNames: ["x"]
// }

// // No breaks (simple case)
// {
//   functionName: ".a",
//   operator: "=", // <- tells us that this is an accessor
//   dependeeNames: []
// }

// // With dependencies
// {
//   functionName: "a:=",
//   operator: ":=", // <- tells us that this is an assignment
//   dependeeNames: [".b", ".c", ".d"]
// }
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
