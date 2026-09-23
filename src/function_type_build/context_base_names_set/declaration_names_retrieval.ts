/* Melody WASM Compiler
 *
 * Copyright (C) 2026 Aria Janke
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

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
