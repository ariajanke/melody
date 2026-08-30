import { FunctionNamingSchema } from '../function_naming_schema';
import { Helpers, raise } from '../helpers';
import { Token } from '../token';
import { IastNode_, IastVisitor_ } from './iast_types';

const { freeze, memoize } = Helpers;

const kIsFringe = Symbol();

interface IastFringeNode extends IastNode_ {
  kIsFringe: symbol;
  asToken(): Token;
};

function chooseVisitorFor(token: Token)
  : <T>(v: IastVisitor_<T>) => T
{
  const tokenTypes = Token.types;
  switch (token.type()) {
  case tokenTypes.identifier:
  case tokenTypes.operator:
    return <T>(v: IastVisitor_<T>): T => v.visitFringe(token);
  case tokenTypes.literal.string:
    return <T>(v: IastVisitor_<T>): T => v.visitLiteral(token, 'string');
  case tokenTypes.literal.numeric:
    return <T>(v: IastVisitor_<T>): T => v.visitLiteral(token, 'number');
  default:
    raise(`cannot build stringable node from token "${token.content()}"`);
  }
}

function tokenize(node: IastFringeNode | IastNode_): Token | undefined {
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

export const IastFringe = freeze({
  tokenize,
  // contextNode: memoize((): IastNode_ => IastFringe.make( Token.kContextToken )),
  makeContextNodeAt(mCallName: Token) {
    const contentToken = freeze({
      ...contentTokenBase(),
      start  : mCallName.start,
      end    : mCallName.end  ,
    });
    return IastFringe.make(contentToken);
  },
  make(mToken: Token): IastFringeNode {
    return freeze({
      kIsFringe,
      asString: () => mToken.content(),
      asToken: () => mToken,
      visit: chooseVisitorFor(mToken)
    });
  }
});
