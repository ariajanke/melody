import {
  DastFunctionNameMappings,
  DastNode,
  DastVisitor
} from '../dast_build';
import { FunctionTypeBuild } from '../function_type_build';
import { Helpers } from '../helpers';
import { CallFunctionBuild } from './call_function_build';
import { ContextFrameStack } from './context_frame_stack';
import { FringeFunctionBuild } from './fringe_function_build';
import { DefinitionIndexFunctionBuild } from './definition_index_function_build';
import { LiteralFunctionTypeBuild } from './literal_function_type_build';
import { TupleFunctionBuild } from './tuple_function_build';
import { FunctionDefinitionRegistry } from '../function_definition_registry';
import { InitialSetFunctionBuild } from './initial_set_function_build';

const { freeze } = Helpers;

function make
  (mFunctionRegistry: FunctionDefinitionRegistry)
  : DastVisitor<FunctionTypeBuild>
{
  const mStackFrameStack = ContextFrameStack.
    make((node: DastNode) => node.visit(inst));
  const { topFrame } = mStackFrameStack;

  const visitFringe = (name: string): FunctionTypeBuild =>
    FringeFunctionBuild.make(name, topFrame());

  function visitCall
    (callName: DastNode, receiver: DastNode, args: DastNode): FunctionTypeBuild
  {
    return CallFunctionBuild.make(callName, receiver, args, topFrame());
  }

  function visitFunctionDefinition
    (defs: DastFunctionNameMappings, nodes: Readonly<DastNode[]>): FunctionTypeBuild
  {
    return DefinitionIndexFunctionBuild.
      make(defs, nodes, mFunctionRegistry, mStackFrameStack);
  }

  function visitInitialSet
    (namesDefined: readonly string[] | string,
     node: DastNode): FunctionTypeBuild
  {
    return InitialSetFunctionBuild.make(namesDefined, node, topFrame());
  }

  const visitTuple = (nodes: Readonly<DastNode[]>): FunctionTypeBuild =>
    TupleFunctionBuild.make(nodes, topFrame().intoBuildFor);
  
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
