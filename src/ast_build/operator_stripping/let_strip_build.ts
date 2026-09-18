import { Helpers, raise, StandardError } from '../../helpers';
import { AstInitializerType, AstLiteralType, AstNode, AstVisitor } from '../../ast_node';
import { Token } from '../../token';
import { StripBuild, StripBuildResult } from './strip_build';

const { freeze, memoize } = Helpers;

const baseVisitor = memoize((): AstVisitor<undefined> => freeze({
  visitLiteral: (_0: Token, _1: AstLiteralType): undefined =>
    undefined,
  visitFringe: (_0: Token): undefined => undefined,
  visitTuple: (_0: Readonly<AstNode[]>): undefined => undefined,
  visitInitializer:
    (_0: Readonly<Token[]>,
     _1: AstInitializerType,
     _2: AstNode): undefined =>
    undefined,
  visitCall: (_0: Token, _1: AstNode, _2: AstNode): undefined =>
    undefined,
  visitFunctionDefinition: (_0: number, _1: Readonly<AstNode[]>): undefined =>
    undefined
}));

const recurseForTuple = (node: AstNode): Token | undefined =>
  node.visit(nextLevel());

const tokenIsAbsent = (value: Token | undefined) =>
  value === undefined;

const topLevel = memoize((): AstVisitor<Readonly<Token[]> | undefined> => freeze({
  ...baseVisitor(),
  visitFringe: (token: Token): Readonly<Token[]> | undefined =>
    [token],
  visitTuple(nodes: Readonly<AstNode[]>): Readonly<Token[]> | undefined {
    const gv = nodes.map(recurseForTuple);
    if (gv.some(tokenIsAbsent))
      { return undefined; }

    return gv as Readonly<Token[]>;
  },
}));

const nextLevel = memoize((): AstVisitor<Token | undefined> => freeze({
  ...baseVisitor(),
  visitFringe: (token: Token): Token | undefined => token
}));

const emptyTupleVisitor = memoize((): AstVisitor<boolean | undefined> => freeze({
  ...baseVisitor(),
  visitTuple: (nodes: Readonly<AstNode[]>): boolean | undefined =>
    nodes.length === 0
}));

function make
  (mRecurseOn: (n: AstNode) => AstNode | undefined,
   _1: Token,
   mReceiver: AstNode,
   mArgs: AstNode)
  : StripBuild
{
  const { error, setErrorMessage } = StandardError.make();
  
  if (!mArgs.visit(emptyTupleVisitor()))
    { raise('parameter node must be an empty tuple'); }

  function withCall(callName: Token, receiver: AstNode, args: AstNode): AstNode | undefined {
    const grouping = callName.content();
    if (grouping !== ':=' && grouping !== '=') {
      return setErrorMessage('let must be declared with either "=" or ":="');
    }

    const names = receiver.visit(topLevel());
    if (!names) {
      return setErrorMessage('invalid name set');
    }

    const gArgs = mRecurseOn(args);
    if (!gArgs)
      { return undefined; }

    return AstNode.forOperatorStripping.
      makeInitializer(names, grouping, gArgs);
  }

  const visitor = (): AstVisitor<AstNode | undefined> => freeze({
    ...baseVisitor(),
    visitCall: withCall
  });

  const node =
    memoize((): StripBuildResult => mReceiver.visit(visitor()));

  return freeze({ node, error });
}

export const LetStripBuild = freeze({ make });
