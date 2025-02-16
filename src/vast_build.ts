// Module internals
import * as astnode from './vast_build/ast_node';
import { StringPoolVisitor } from './vast_build/string_pool_visitor';
import * as astbuild from './vast_build/ast_build';
// Public
import { ContextType, ContextTypeInjections } from './context_type';
import { Helpers, StandardErrorMessage } from './helpers';
import { ObjectLookUpTable } from './object_look_up_table';
import { VastNode } from './vast_node';
import { StringPool } from './string_pool';
import { NewVastBuildVisitor } from './vast_build/vast_build_visitor';

const { freeze, memoize } = Helpers;

// Validated Abstract Syntax Tree Node, just doesn't quite roll off the tongue

export interface VastBuild {
  root(): VastNode | undefined,
  stringPool(): StringPool | undefined,
  errors(): Readonly<StandardErrorMessage[]>
}

function makeStringPoolFrom
  (mRootNode: AstNode,
   makeStringPool: (fn: () => string[]) => StringPool = StringPool.makeForStrings): StringPool
{
  const strings = mRootNode.visit(StringPoolVisitor.instance());
  return makeStringPool(() => strings);
}

function construct(mRootNode: AstNode,
                   mStringPool: StringPool,
                   mContextInjections?: ContextTypeInjections,
                   mStartContextType?: typeof ContextType.makeWritable,
                   mObjectTable?: ObjectLookUpTable)
{
  mObjectTable ??= ObjectLookUpTable.make().addBuiltinTypes();
  mContextInjections ??= ContextType.defaultInjections();
  mStartContextType ??= ContextType.makeWritable;

  const mVisitor = NewVastBuildVisitor.
    make(mStringPool, mObjectTable, () => mStartContextType(mContextInjections));
  const result = memoize(() => mRootNode.visit(mVisitor));
  return freeze({
    root: memoize(() => result().node()),
    stringPool: () => mStringPool,
    errors: memoize(() => result().errors())
  }) satisfies VastBuild;
}

export const VastBuild = freeze({
  make: construct,
  makeStringPoolFrom
});

export const AstBuild = astbuild.AstBuild;
export type  AstNode  = astnode.AstNode  ;
