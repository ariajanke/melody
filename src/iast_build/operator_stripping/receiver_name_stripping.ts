import { Helpers, raise, StandardError, StandardErrorMessage } from '../../helpers';
import { IastNode, IastVisitor } from '../../iast_node';
import { IastLiteralType } from '../../iast_node';
import { OperatorNamingSchema } from '../../operator_naming_schema';
import { Token } from '../../token';
import { OperatorDefinitions } from '../operator_definitions';

const { freeze, memoize } = Helpers;

export interface ReceiverNameStripping {
  nameTarget(): Token | undefined;
  strippedTree(): IastNode | undefined;
  error(): StandardErrorMessage;
};

function assumeDotIsTightest() {
const { fullListing } = OperatorDefinitions;
  const tightestBindingOperator = fullListing()[fullListing().length - 1];
  if (tightestBindingOperator.representation === OperatorNamingSchema.kDot) {
    return;
  }
  raise('The dot operator was assumed to be the tightest binding operator, but it is not');
}

function make(mRoot: IastNode): ReceiverNameStripping {
  type Direction = 'not-right' | 'right';
  type Res = IastNode | 'not-modified' | undefined;
  let mNameTarget: Token | undefined = undefined;
  let mDirection: Direction = 'right';
  const { setErrorMessage, error } = StandardError.make();  
  const {
    makeTuple,
    makeCall,
    makeLetDeclation,
    tokenize,
    makeContextNodeAt,
  } = IastNode.forOperatorStripping;

  assumeDotIsTightest();

  function furtherVisit(node: IastNode, dir: Direction): Res {
    const originalDirection = mDirection;
    if (originalDirection === 'right') {
      mDirection = dir;
    }
    const rv = node.visit(mVisitor);
    mDirection = originalDirection;
    return rv;
  }

  function visitLiteral(_0: Token, _1: IastLiteralType): Res {
    if (mDirection === 'right') {
      return setErrorMessage('cannot use literal as a target of an assignment');
    }

    return 'not-modified';
  };

  function visitFringe(token: Token): Res {
    if (mDirection === 'right') {
      mNameTarget = token;
      return makeContextNodeAt(token);
    }

    return 'not-modified';
  }

  // FEATURE-TODO
  // invert the call with the tuple
  // the tuple acts as a series of assigments based on the rhs
  // not supportable
  function visitTuple(nodes: Readonly<IastNode[]>): Res {
    if (nodes.length === 1 && mDirection === 'right') {
      const rv = furtherVisit(nodes[0], mDirection);
      if (rv === 'not-modified' || rv === undefined)
        { return rv; }

      return makeTuple([rv]);
    }

    if (mDirection === 'right') {
      return setErrorMessage('cannot use assignment on a multi-member tuple');
    }

    return 'not-modified';
  }

  function visitCall
    (callName: Token, receiver: IastNode, parameters: IastNode): Res
  {
    const token = tokenize(parameters);
    if (token &&
        callName.content() === OperatorNamingSchema.kDot &&
        mDirection === 'right')
    {
      mNameTarget = token;
      return receiver;
    }

    const recRv = furtherVisit(receiver, 'not-right');
    if (recRv === undefined)
      { return recRv; }

    if (recRv !== 'not-modified')
      { raise('non-right branch modified!'); }

    const rv = furtherVisit(parameters, 'right');
    if (rv === undefined || rv === 'not-modified')
      { return rv; }

    return makeCall(callName, receiver, rv);
  }

  function visitLet(innerNode: IastNode): Res {
    const rv = furtherVisit(innerNode, mDirection);
    if (rv === undefined || rv === 'not-modified')
      { return rv; }

    return makeLetDeclation(rv);
  }

  function visitFunctionDefinition(nodes: Readonly<IastNode[]>): Res {
    if (mDirection === 'right') {
      return setErrorMessage('a function definition cannot be a target of an assignment');
    }

    nodes.forEach((n: IastNode) => {
      const rv = furtherVisit(n, 'not-right');
      if (rv === undefined || rv === 'not-modified')
        { return; }

      raise('non-right branch modified!');
    });

    return 'not-modified';
  }

  const mVisitor: IastVisitor<Res> = freeze({
    visitLiteral,
    visitFringe,
    visitTuple,
    visitCall,
    visitLet,
    visitFunctionDefinition
  });

  const strippedTree = memoize((): IastNode | undefined => {
    const res = mRoot.visit(mVisitor);
    if (res === 'not-modified')
      { return mRoot; }

    return res;
  });

  const nameTarget = memoize((): Token | undefined => {
    if (!strippedTree())
      { return undefined; }

    return mNameTarget;
  });

  return freeze({
    nameTarget,
    strippedTree,
    error
  });
}

export const ReceiverNameStripping = freeze({ make });
