import {
  DastFunctionNameMappings,
  DastNode,
  DastVisitor
} from '../dast_build';
import { FunctionTypeBuild, ObjectType } from '../function_type_build';
import { FunctionTypeRegistry } from '../function_type_registry';
import { Helpers, raise } from '../helpers';
import { CallFunctionBuild } from './call_function_build';
// import { StringPoolBuilder } from '../string_pool';
// import { CallFunctionTypeBuild } from './call_function_build';
import { ContextFrameStack } from './context_frame_stack';
// import { DastBuildCache } from './dast_build_cache';
// import { DeclaredContextStack } from './declared_context_stack';
import { FringeFunctionBuild } from './fringe_function_build';
import { FunctionDefinitionIndexBuild } from './function_definition_index_build';
// import { InitialSetBuild } from './initial_set_function_build';
import { LiteralFunctionTypeBuild } from './literal_function_type_build';
import { TupleFunctionTypeBuild } from './tuple_function_type_build';

const { freeze } = Helpers;

export type HoldContextTypeFunction =
  <T>(getter: () => ObjectType, whileFn: () => T) => T;

// I have to finish this
// If I do that's a portfolio piece (in conjunction with a demo branch)
// It represents a good place to stop for this project as well and pivot to demos  of competency in other domains like RDBMSs (Rails)
// That way I have a good demo set for interviews
function make
  (//mStringPoolBuilder: StringPoolBuilder,
   mFunctionRegistry: FunctionTypeRegistry)
  : DastVisitor<FunctionTypeBuild>
{
  const mStackFrameStack = ContextFrameStack.
    make((node: DastNode) => node.visit(inst));
  const { topFrame, intoBuildFunction } = mStackFrameStack;

  const visitFringe = (name: string): FunctionTypeBuild =>
    FringeFunctionBuild.make(name, topFrame());

  function visitCall(callName: DastNode, receiver: DastNode, args: DastNode): FunctionTypeBuild {
    // TODO check for "not ready" at the top of the stack?
    return CallFunctionBuild.
      make(callName,
           receiver,
           args,
           topFrame());
  }

  function visitFunctionDefinition
    (defs: DastFunctionNameMappings, nodes: Readonly<DastNode[]>): FunctionTypeBuild
  {
    return FunctionDefinitionIndexBuild.
      make(defs,
           nodes,
           mBuildCache.checkCachedBuild,
           mDeclaredContextStack,
           mFunctionRegistry);
  }

  function visitInitialSet(namesDefined: readonly string[] | string, node: DastNode): FunctionTypeBuild {
    return InitialSetFunctionBuild.
      make(namesDefined,
           mBuildCache.checkCachedBuild(node),
           topFrame());
  }

  const visitTuple = (nodes: Readonly<DastNode[]>): FunctionTypeBuild =>
    TupleFunctionTypeBuild.make(nodes, mBuildCache.checkCachedBuild);
  
  const inst = freeze({
    visitCall,
    visitFringe,
    visitFunctionDefinition,
    visitInitialSet,
    visitInteger: LiteralFunctionTypeBuild.makeForInteger,
    visitString: LiteralFunctionTypeBuild.makeForString,
    visitTuple
  });
  return inst;
}

export const FunctionTypeBuildVisitor = freeze({ make });
