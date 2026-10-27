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

import { AstCallNode, AstDefinitionNode, AstIdentifierNode, AstInitializerNode, AstLiteralNode, AstNode, AstTupleNode } from '../../ast_node';
import { Helpers } from '../../helpers';
import { ObjectType } from '../../melody_components';
import { UsedContextNames } from '../context_names_tree_set';
import { UsedAncestorCollection } from './used_ancestor_collection';

const { freeze } = Helpers;

export interface TreeWideAncestorSet {
  // enable access to used ancestors collection for each child of a given node
  // a fully named context is a context that has all(?) of it's method names added
  addFullyNamedContext(
    node: AstDefinitionNode,
    uniqueName: string,
    fullyNamedContext: ObjectType): TreeWideAncestorSet;
  // access must be enabled, or this will raise!
  // if a def node has any pending names, attempt to get this
  // in the root case, simply fail to retrieve and allow methods to be left
  // undefined (therefore allowing future error handling to catch undefines)
  usedAncestorsCollectionFor(node: AstDefinitionNode): UsedAncestorCollection;
};

function make
  (mContextNamesFor: (node: AstDefinitionNode) => UsedContextNames)
  : TreeWideAncestorSet
{
  function addFullyNamedContext(
    node: AstDefinitionNode,
    uniqueName: string,
    fullyNamedContext: ObjectType): TreeWideAncestorSet
  {
    // referenceType, uniqueName
    mContextNamesFor(node);
    // put the new type on the stack, then you have to iterate every child
    // creating your used collections long before "usedAncestorsCollectionFor"
    // is ever called
    node.nodes.forEach(addUacsFor);
    return inst;
  }

  function usedAncestorsCollectionFor
    (node: AstDefinitionNode): TreeWideAncestorSet
  {

  }

  type ResultType = void;
  function visitLiteral(_0: AstLiteralNode): ResultType {}
  function visitFringe(_0: AstIdentifierNode): ResultType {}
  function visitTuple(n: AstTupleNode): ResultType
    { n.nodes.forEach(addUacsFor); }
  function visitInitializer(n: AstInitializerNode): ResultType
    { addUacsFor(n.valueNode); }
  function visitCall(n: AstCallNode): ResultType {
    addUacsFor(n.parameters);
    addUacsFor(n.receiver);
  }
  function visitFunctionDefinition(node: AstDefinitionNode): ResultType {
    // NOTE stop recurring!
  }
  function addUacsFor(node: AstNode) { node.visit(mVisitor); }
  const mVisitor = freeze({
    visitLiteral,
    visitFringe,
    visitTuple,
    visitInitializer,
    visitCall,
    visitFunctionDefinition
  });

  const inst = freeze({
    usedAncestorsCollectionFor,
    addFullyNamedContext
  });
  return inst;
}

export const TreeWideAncestorSet = freeze({ make });
