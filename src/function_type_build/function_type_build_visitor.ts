import {
  DastFunctionNameMappings,
  DastNode,
  DastVisitor
} from '../dast_build';
import { FunctionTypeBuild, ObjectType } from '../function_type_build';
import { FunctionTypeRegistry } from '../function_type_registry';
import { Helpers, raise } from '../helpers';
import { StringPoolBuilder } from '../string_pool';
import { CallFunctionTypeBuild } from './call_function_type_build';
import { ContextFrameStack } from './context_frame_stack';
// import { DastBuildCache } from './dast_build_cache';
// import { DeclaredContextStack } from './declared_context_stack';
import { FringeFunctionBuild } from './fringe_function_build';
import { FunctionDefinitionIndexBuild } from './function_definition_index_build';
import { InitialSetBuild } from './initial_set_build';
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
  (mStringPoolBuilder: StringPoolBuilder,
   mFunctionRegistry: FunctionTypeRegistry)
  : DastVisitor<FunctionTypeBuild>
{
  // const mBuildCache = DastBuildCache.
  //   make((node: DastNode) => node.visit(inst));
  // const mDeclaredContextStack = DeclaredContextStack.make();
  const mStackFrameStack = ContextFrameStack.make();
  const mFurtherVisit = (node: DastNode) => node.visit(inst);
  // const topContext = (): ObjectType =>
  //   mDeclaredContextStack.contextForHop(0)?.contextType() ??
  //   raise('No current context!');

  const visitFringe = (name: string): FunctionTypeBuild =>
    FringeFunctionBuild.make(name, topContext);

  const visitString = (string_: string): FunctionTypeBuild => 
    LiteralFunctionTypeBuild.makeForString(string_, mStringPoolBuilder);

  function visitCall(callName: DastNode, receiver: DastNode, args: DastNode): FunctionTypeBuild {
    return CallFunctionTypeBuild.
      make(callName,
           receiver,
           args,
           topContext().sizeInBytes,
           mBuildCache.checkCachedBuild);
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
    return InitialSetBuild.
      make(namesDefined,
           mBuildCache.checkCachedBuild(node),
           topContext);
  }

  const visitTuple = (nodes: Readonly<DastNode[]>): FunctionTypeBuild =>
    TupleFunctionTypeBuild.make(nodes, mBuildCache.checkCachedBuild);
  
  const inst = freeze({
    visitCall,
    visitFringe,
    visitFunctionDefinition,
    visitInitialSet,
    visitInteger: LiteralFunctionTypeBuild.makeForInteger,
    visitString,
    visitTuple
  });
  return inst;
}

export const FunctionTypeBuildVisitor = freeze({ make });
