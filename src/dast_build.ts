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
  /// If present, this variable is part of a tuple, it's rank is the (array)
  /// position of the type for which this variable is.
  tupleRank?: number;
  variableName: string;
};

export interface DastLetDeclaration {
  /// This node determines the object type of this declaration's variable(s),
  /// and subsequently it's function type.
  /// Note that many declared functions may share a single value node, be it
  /// part of the same series by variable name, or as a member of a tuple.
  value: DastNode;

  accessor?: DastAttributeDeclaration;
  assignment?: DastAttributeDeclaration;

  /// If present, this declares an initial set function.
  /// Every accessor and assignment will have a corresponding initial set
  initialSet?: {
    /// variables defined by this initial set
    /// Multiple names means a tuple initial set (e.g "let (a, b, ...) = ...")
    variableNames: Readonly<string[]>;
    /// dependee names are function names which must be defined first, in order
    /// for this declaration to be definable
    dependeeNames: Readonly<string[]>;
  };
};

export type WritableDastDeclarationMap =
  { [functionName: string]: DastLetDeclaration };
export type DastDeclarationMap = Readonly<WritableDastDeclarationMap>;
export interface DastFunctionNameMappings {
  /// A unique name assigned to this function.
  name: string;

  /// Any name which this function declares via a let statement.
  declaredNames: DastDeclarationMap;

  /// Pending names will contain all functions which are used, but neither
  /// declared nor builtin. "<parent>" maybe indirectly used, if there are
  /// pending names in a child function (even if this function has no pending
  /// names of its own).
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

/// Builds a DAST, from the given IAST root node.
/// DAST: Declartive Abstract Syntax Tree
/// This tree has names (declarations and pending) are all laid out
/// conveniently for function type building. Its schema is validated before
/// finally returning.
export const DastBuild = freeze({
  make(mRoot: IastNode,
       mVisitor = DastBuildVisitor.make(),
       mMakeValidator = DastValidator.make)
    : DastBuild
  {
    const { error, setErrorFn } = StandardError.make();

    const build = memoize((): DastBuild => mRoot.visit(mVisitor));
    const builtNode = memoize(() =>
      build().node() ?? setErrorFn(build().error));

    const node = memoize(() => {
      const node = builtNode();
      if (!node) { return undefined; }

      const validator = mMakeValidator(node);
      return validator.node() ?? setErrorFn(validator.error);
    });

    return freeze({ node, error });
  }
});
