import { FunctionNamingSchema } from '../../function_naming_schema';
import { Helpers } from '../../helpers';
import { Token } from '../../token';
import {
  AstInitializerType,
  AstLiteralType,
  AstNode,
  AstVisitor
} from '../../ast_node';

const { freeze, memoize } = Helpers;

export type WritableNameSet = { [name: string]: true };
export type NameSet = Readonly<WritableNameSet>;

export type NameDeclaration = Readonly<{
  names: Readonly<string[]>;
  type: AstInitializerType;
  value: AstNode;
}>;

export type ChildFunctionDefinition = Readonly<{
  nodes: Readonly<AstNode[]>;
  uid  : number;
}>;

export interface DeclarationNamesRetrieval {
  declarations(): Readonly<NameDeclaration[]>;
  usedNames(): NameSet;
  childDefinitions(): Readonly<ChildFunctionDefinition[]>;
};

function visitLiteral(_0: Token, _1: AstLiteralType): void {}

const { kContextName, mapToFringeAccessor } = FunctionNamingSchema;

const tokenToString = (token: Token) => token.content();

function make
  (mDefNodes: Readonly<AstNode[]>): DeclarationNamesRetrieval
{
  const mDeclarations: NameDeclaration[] = [];
  const mUsedNames: WritableNameSet = {};
  const mChildDefs: ChildFunctionDefinition[] = [];
  
  const recurse = (node: AstNode) => node.visit(mVisitor);
  const mVisitor: AstVisitor<void> = freeze({
    visitLiteral,
    visitFunctionDefinition(uid: number, nodes: Readonly<AstNode[]>): void {
      mChildDefs.push(freeze({ nodes, uid }));
      // NOTE do not recur!
    },
    visitFringe(token: Token): void {
      const v = token.content();
      if (v !== kContextName) {
        mUsedNames[mapToFringeAccessor(v)] = true;  
      }
    },
    visitTuple(nodes: Readonly<AstNode[]>): void {
      nodes.forEach(recurse);
    },
    visitInitializer(
      names: Readonly<Token[]>,
      type: AstInitializerType,
      value: AstNode): void
    {
      mDeclarations.push(freeze({
        names: names.map(tokenToString),
        type,
        value
      }));
      recurse(value);
    },
    visitCall(
      callName: Token,
      receiver: AstNode,
      args: AstNode): void
    {
      // NOTE only for context receiver...
      // TODO need a better fix
      if (receiver.asString() === FunctionNamingSchema.kContextName) {
        mUsedNames[callName.content()] = true;
      }
      recurse(receiver);
      recurse(args);
    }
  });

  const visitedDefNodes = memoize((): Readonly<AstNode[]> => {
    mDefNodes.forEach(recurse);
    return mDefNodes;
  });

  return freeze({
    usedNames: (): NameSet =>
      visitedDefNodes() && mUsedNames,
    childDefinitions: (): Readonly<ChildFunctionDefinition[]> =>
      visitedDefNodes() && mChildDefs,
    declarations: (): Readonly<NameDeclaration[]> =>
      visitedDefNodes() && mDeclarations
  });
}

export const DeclarationNamesRetrieval = freeze({ make });
