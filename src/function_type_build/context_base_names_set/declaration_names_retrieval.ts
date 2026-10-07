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
import {
  AstCallNode,
  AstDefinitionNode,
  AstIdentifierNode,
  AstInitializerNode,
  AstLiteralNode,
  AstNode,
  AstParameterExpression,
  AstTupleNode,
  AstVisitor
} from '../../ast_node';

const { freeze, memoize } = Helpers;

export type WritableNameSet = { [name: string]: true };
export type NameSet = Readonly<WritableNameSet>;

export interface DeclarationNamesRetrieval {
  parameters      (): Readonly<AstParameterExpression[]>;
  declarations    (): Readonly<AstInitializerNode[]>;
  usedNames       (): NameSet;
  childDefinitions(): Readonly<AstDefinitionNode[]>;
};

function visitLiteral(_0: AstLiteralNode): void {}

const { kContextName, mapToFringeAccessor } = FunctionNamingSchema;

function make
  (mParameters: Readonly<AstParameterExpression[]>,
   mDefNodes: Readonly<AstNode[]>): DeclarationNamesRetrieval
{
  const mDeclarations: AstInitializerNode[] = [];
  const mUsedNames: WritableNameSet = {};
  const mChildDefs: AstDefinitionNode[] = [];
  
  const recurse = (node: AstNode) => node.visit(mVisitor);
  const mVisitor: AstVisitor<void> = freeze({
    visitLiteral,
    visitFunctionDefinition(def: AstDefinitionNode): void
    {
      mChildDefs.push(def);
      // NOTE do not recur!
    },
    visitFringe(n: AstIdentifierNode): void {
      const v = n.token.content();
      if (v !== kContextName) {
        mUsedNames[mapToFringeAccessor(v)] = true;  
      }
    },
    visitTuple(n: AstTupleNode): void {
      n.nodes.forEach(recurse);
    },
    visitInitializer(initializer: AstInitializerNode): void {
      mDeclarations.push(initializer);
      recurse(initializer.valueNode);
    },
    visitCall(n: AstCallNode): void {
      const { receiver, callName, parameters } = n;
      // NOTE only for context receiver...
      // TODO need a better fix
      if (receiver.asString() === FunctionNamingSchema.kContextName) {
        mUsedNames[callName.content()] = true;
      }
      recurse(receiver);
      recurse(parameters);
    }
  });

  const visitedDefNodes = memoize((): Readonly<AstNode[]> => {
    mDefNodes.forEach(recurse);
    return mDefNodes;
  });

  const declarations = memoize((): Readonly<AstInitializerNode[]> =>
    visitedDefNodes() && mDeclarations);

  return freeze({
    parameters: () => mParameters,
    usedNames: (): NameSet =>
      visitedDefNodes() && mUsedNames,
    childDefinitions: (): Readonly<AstDefinitionNode[]> =>
      visitedDefNodes() && mChildDefs,
    declarations
  });
}

export const DeclarationNamesRetrieval = freeze({ make });
