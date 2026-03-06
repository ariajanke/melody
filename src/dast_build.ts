import { DastBuildVisitor } from './dast_build/dast_build_visitor';
import { DastNode_ } from './dast_build/dast_node';
import { DastValidator } from './dast_build/dast_validator';
import { DastVisitor_ } from './dast_build/dast_visitor';
import { Helpers, StandardError, StandardErrorMessage } from './helpers';
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
  value: DastNode;

  accessor?: DastAttributeDeclaration;
  assignment?: DastAttributeDeclaration;
  initialSet?: {
    variableNames: Readonly<string[]>;
    dependeeNames: Readonly<string[]>;  
  };
};

// we build DFS style
// having pending names mean... 

export type WritableDastDeclarationMap = { [functionName: string]: DastLetDeclaration };
export type DastDeclarationMap = Readonly<WritableDastDeclarationMap>;
export interface DastFunctionNameMappings {
  name: string;
  declaredNames: DastDeclarationMap;
  // names used by this function, but declared elsewhere
  // however there is a mid parent case:
  // <root>:
  //   declared: ['.a']
  //   <f1>:
  //     pending: ['<parent>']
  //     <f2>:
  //       pending: ['.a']
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
// DAST: Declartive Abstract Syntax Tree
// Fundamentally IAST -> DAST describes that creation of DAST. Its use is for
// creating a tree which names are all laid out conviently for function type
// building. Its schema is validated before finally returning.
export const DastBuild = freeze({
  make(root: IastNode) {
    const { error, setErrorFn } = StandardError.make();

    const mVisitor = DastBuildVisitor.make();
    const build = memoize((): DastBuild => root.visit(mVisitor));
    const builtNode = memoize(() =>
      build().node() ?? setErrorFn(build().error));

    const node = memoize(() => {
      const node = builtNode();
      if (!node) { return undefined; }

      const validator = DastValidator.make(node);
      return validator.node() ?? setErrorFn(validator.error);
    });

    return freeze({ node, error });
  }
});
