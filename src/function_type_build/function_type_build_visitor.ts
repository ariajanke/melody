import { CallBackObjectHold } from '../call_back_object_hold';
import {
  DastFunctionNameMappings,
  DastNode,
  DastVisitor
} from '../dast_build';
import { FunctionTypeBuild, ObjectType } from '../function_type_build';
import { FunctionTypeRegistry } from '../function_type_registry';
import { Helpers } from '../helpers';
import { StringPoolBuilder } from '../string_pool';
import { AccumulatedPendingNameMap } from './accumulated_pending_name_map';
import { CallFunctionTypeBuild } from './call_function_type_build';
import { DastBuildCache } from './dast_build_cache';
import { FringeFunctionBuild } from './fringe_function_build';
import { FunctionDefinitionIndexBuild } from './function_definition_index_build';
import { InitialSetBuild } from './initial_set_build';
import { LiteralFunctionTypeBuild } from './literal_function_type_build';
import { TupleFunctionTypeBuild } from './tuple_function_type_build';

const { freeze } = Helpers;

export type HoldContextTypeFunction =
  <T>(getter: () => ObjectType, whileFn: () => T) => T;

function make
  (mStringPoolBuilder: StringPoolBuilder,
   mFunctionRegistry: FunctionTypeRegistry,
   mNamesAccumulator: AccumulatedPendingNameMap)
  : DastVisitor<FunctionTypeBuild>
{
  const mBuildCache = DastBuildCache.
    make((node: DastNode) => node.visit(inst));
  const mHolder = CallBackObjectHold.
    make<ObjectType>('root node must be a function definition');
  const { currentObject } = mHolder;

  const visitFringe = (name: string) =>
    FringeFunctionBuild.make(name, currentObject);

  const visitString = (string_: string): FunctionTypeBuild => 
    LiteralFunctionTypeBuild.makeForString(string_, mStringPoolBuilder);

  function visitCall(callName: DastNode, receiver: DastNode, args: DastNode): FunctionTypeBuild {
    return CallFunctionTypeBuild.
      make(callName,
           receiver,
           args,
           currentObject().sizeInBytes,
           mBuildCache.checkCachedBuild);
  }

  function visitFunctionDefinition
    (defs: DastFunctionNameMappings, nodes: Readonly<DastNode[]>): FunctionTypeBuild
  {
    return FunctionDefinitionIndexBuild.
      make(defs, nodes, mBuildCache.checkCachedBuild, mHolder, mFunctionRegistry);
  }

  function visitInitialSet(namesDefined: readonly string[] | string, node: DastNode): FunctionTypeBuild {
    return InitialSetBuild.
      make(namesDefined, mBuildCache.checkCachedBuild(node), currentObject);
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
