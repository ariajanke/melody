import { FunctionTypeBuild } from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { CallFunctionBuild } from './call_function_build';
import { ContextFrameStack } from './context_frame_stack';
import { FringeFunctionBuild } from './fringe_function_build';
import { DefinitionIndexFunctionBuild } from './definition_index_function_build';
import { LiteralFunctionTypeBuild } from './literal_function_type_build';
import { TupleFunctionBuild } from './tuple_function_build';
import { FunctionDefinitionRegistry } from '../function_definition_registry';
import { AstInitializerType, AstLiteralType, AstNode, AstVisitor } from '../ast_node';
import { Token } from '../token';
import { InitializerFunctionBuild } from './initializer_function_build';

const { freeze } = Helpers;

function make
  (mFunctionRegistry: FunctionDefinitionRegistry)
  : AstVisitor<FunctionTypeBuild>
{
  const mStackFrameStack = ContextFrameStack.
    make((node: AstNode) => node.visit(inst));
  const { topFrame } = mStackFrameStack;

  const visitFringe = (name: Token): FunctionTypeBuild =>
    FringeFunctionBuild.make(name.content(), topFrame());

  function visitLiteral(token: Token, type: AstLiteralType): FunctionTypeBuild {
    if (type === 'number') {
      return LiteralFunctionTypeBuild.makeForInteger(token.content());
    } else if (type === 'string') {
      return LiteralFunctionTypeBuild.makeForString(token.content());
    }
    raise('unhandled literal type');
  }

  function visitCall
    (callName: Token, receiver: AstNode, args: AstNode): FunctionTypeBuild
  {
    return CallFunctionBuild.make(callName, receiver, args, topFrame());
  }

  function visitFunctionDefinition
    (uid: number, nodes: Readonly<AstNode[]>): FunctionTypeBuild
  {
    return DefinitionIndexFunctionBuild.
      make(uid, nodes, mFunctionRegistry, mStackFrameStack);
  }

  function visitInitializer
    (names: Readonly<Token[]>,
     _1: AstInitializerType,
     node: AstNode): FunctionTypeBuild
  {
    return InitializerFunctionBuild.make(names.map(t => t.content()), node, topFrame());
  }

  const visitTuple = (nodes: Readonly<AstNode[]>): FunctionTypeBuild =>
    TupleFunctionBuild.make(nodes, topFrame().intoBuildFor);
  
  const inst = freeze({
    visitCall,
    visitFringe,
    visitFunctionDefinition,
    visitInitializer,
    visitLiteral,
    visitTuple
  });
  return inst;
}

export const FunctionTypeBuildVisitor = freeze({ make });
