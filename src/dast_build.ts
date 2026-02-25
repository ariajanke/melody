import { DastBuildVisitor } from './dast_build/dast_build_visitor';
import { DastNode_ } from './dast_build/dast_node';
import { DastVisitor_ } from './dast_build/dast_visitor';
import { DeclarationOperator } from './function_naming_schema';
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
export interface DastLetDeclaration {
  // functionName: string; // e.g. <initSet>:(a) or, .a, a:=
  intoVariableNames?: Readonly<string[]>; // e.g. for <initSet>:(a,b) -> [a, b], for <initSet>:(a) -> [a]
  operator: DeclarationOperator;
  dependeeNames: Readonly<string[]>;
  value: DastNode;
};

export interface DastLetDeclarationMap {
  [functionName: string]: DastLetDeclaration;
};
export type DastLetDeclarationMaps = Readonly<DastLetDeclarationMap[]>;

export interface DastFunctionNameMappings {
  // name can represent a specific function name
  // we've decided the order of these things is important...
  // [name: string]: {
  //   breaksInto?: Readonly<string[]>;
  //   operator: DeclarationOperator;
  //   dependeeNames: Readonly<string[]>;
  //   value: DastNode;
  // } | 'pending';
  declarations: Readonly<DastLetDeclarationMap>;
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
