import { FunctionNamingSchema } from '../function_naming_schema';
import { Helpers, raise } from '../helpers';
import { Token } from '../token';
import { AstDefinition } from './ast_other_nodes';
import { AstNode_, AstVisitor_ } from './ast_types';

const { freeze, memoize } = Helpers;

const kIsFringe = Symbol();

interface AstFringeNode extends AstNode_ {
  kIsFringe: symbol;
  asToken(): Token;
};

function chooseVisitorFor(token: Token)
  : <T>(v: AstVisitor_<T>) => T
{
  const tokenTypes = Token.types;
  switch (token.type()) {
  case tokenTypes.identifier:
  case tokenTypes.operator:
    return <T>(v: AstVisitor_<T>): T => v.visitFringe(token);
  case tokenTypes.literal.string:
    return <T>(v: AstVisitor_<T>): T => v.visitLiteral(token, 'string');
  case tokenTypes.literal.numeric:
    return <T>(v: AstVisitor_<T>): T => v.visitLiteral(token, 'number');
  default:
    raise(`cannot build stringable node from token "${token.content()}"`);
  }
}

function tokenize(node: AstFringeNode | AstNode_): Token | undefined {
  if ('kIsFringe' in node && node.kIsFringe === kIsFringe)
    { return node.asToken(); }

  return undefined;
}

const contentTokenBase = memoize((): Token => freeze({
  start  : (): number => raise('define me'),
  end    : (): number => raise('define me'),
  content: () => FunctionNamingSchema.kContextName,
  type   : () => Token.types.identifier
}));

export const AstFringe = freeze({
  tokenize,
  makeContextNodeAt(mCallName: Token) {
    const contentToken = freeze({
      ...contentTokenBase(),
      start  : mCallName.start,
      end    : mCallName.end  ,
    });
    return AstFringe.make(contentToken);
  },
  make(mToken: Token): AstFringeNode {
    return freeze({
      kIsFringe,
      asString: () => mToken.content(),
      asToken: () => mToken,
      visit: chooseVisitorFor(mToken),
      uid: AstDefinition.makeUid()
    });
  }
});
