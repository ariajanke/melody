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
  AstInitializerExpression,
  AstLiteralType,
  AstNode,
  AstParameterExpression,
  AstVisitor
} from '../../ast_node';

const { freeze, memoize } = Helpers;

export type WritableNameSet = { [name: string]: true };
export type NameSet = Readonly<WritableNameSet>;

export type ChildFunctionDefinition = Readonly<{
  nodes     : Readonly<AstNode[]>;
  parameters: Readonly<AstParameterExpression[]>;
  uid       : number;
}>;

export interface DeclarationNamesRetrieval {
  parameters      (): Readonly<AstParameterExpression[]>;
  declarations    (): Readonly<AstInitializerExpression[]>;
  usedNames       (): NameSet;
  childDefinitions(): Readonly<ChildFunctionDefinition[]>;
};

function visitLiteral(_0: Token, _1: AstLiteralType): void {}

const { kContextName, mapToFringeAccessor } = FunctionNamingSchema;

function make
  (mParameters: Readonly<AstParameterExpression[]>,
   mDefNodes: Readonly<AstNode[]>): DeclarationNamesRetrieval
{
  const mDeclarations: AstInitializerExpression[] = [];
  const mUsedNames: WritableNameSet = {};
  const mChildDefs: ChildFunctionDefinition[] = [];
  
  const recurse = (node: AstNode) => node.visit(mVisitor);
  const mVisitor: AstVisitor<void> = freeze({
    visitLiteral,
    visitFunctionDefinition(
      uid: number,
      parameters: Readonly<AstParameterExpression[]>,
      nodes: Readonly<AstNode[]>): void
    {
      mChildDefs.push(freeze({ nodes, parameters, uid }));
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
    visitInitializer(initializer: AstInitializerExpression): void {
      mDeclarations.push(initializer);
      recurse(initializer.valueNode);
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

  const declarations = memoize((): Readonly<AstInitializerExpression[]> =>
    visitedDefNodes() && mDeclarations);

  return freeze({
    parameters: () => mParameters,
    usedNames: (): NameSet =>
      visitedDefNodes() && mUsedNames,
    childDefinitions: (): Readonly<ChildFunctionDefinition[]> =>
      visitedDefNodes() && mChildDefs,
    declarations
  });
}

export const DeclarationNamesRetrieval = freeze({ make });
