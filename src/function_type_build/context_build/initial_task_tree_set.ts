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

import { Helpers } from '../../helpers';
import { WritableObjectType } from './writable_object_type';
import {
  AstCallNode,
  AstDefinitionNode,
  AstIdentifierNode,
  AstInitializerNode,
  AstLiteralNode,
  AstNode,
  AstTupleNode
} from '../../ast_node';
import { FunctionTypeAssociationSet } from '../function_type_association_set';
import { ContextNamesTreeSet } from '../context_names_tree_set';
import { TreeWideAncestorCollection } from './tree_wide_ancestor_collection';
import { ContextShiftTask, MutableNodeEntitySet, NodeEntitySet } from './task_controller';
import { UsedAncestorCollection } from './used_ancestor_collection';
import { FringeEntityBuild } from '../fringe_entity_build';
import { CallEntityBuild } from '../call_entity_build';
import { LiteralEntityBuild } from '../literal_entity_build';
import { ConstantEntity } from '../../melody_components';
import { EndToEndHelpers } from '../../../tests/end_to_end_helpers';
import { DeclarationShiftTask } from './declaration_shift';

const { freeze, memoize } = Helpers;

interface InitialTaskTreeSet {
  tasks(): Readonly<ContextShiftTask[]>;
};


// this should consume a ContextBaseNamesSet instance completely
function make
  (mRoot: AstDefinitionNode,
  //  mTreeWideAncestorCollection: TreeWideAncestorCollection,
   mNodeEntitySet: MutableNodeEntitySet,
   mAssociations: FunctionTypeAssociationSet = FunctionTypeAssociationSet.make(),
   mBaseStageNamesCtor = ContextNamesTreeSet.make)
{
  const { contextNamesFor, baseStageFor } = mBaseStageNamesCtor(mRoot);
  const { addFullyNamedContext, usedAncestorsCollectionFor } = mTreeWideAncestorCollection;
  const mContextShiftTasks: ContextShiftTask[] = [];
  type ResultType = void;
  function visitLiteral(litNode: AstLiteralNode): ResultType {
    const { entity } = LiteralEntityBuild.make(litNode);
    if (entity())
      {}

    mNodeEntitySet.append(litNode, entity()!);
  }
  function visitFringe(n: AstIdentifierNode): ResultType {
    // FringeEntityBuild.make(n, , );
  }
  function visitTuple(n: AstTupleNode): ResultType {
    n.nodes.forEach(recurse);
  }
  function visitInitializer(n: AstInitializerNode): ResultType {
    recurse(n.valueNode);
    mContextShiftTasks.push(DeclarationShiftTask.make(n));
  }
  function visitCall(n: AstCallNode): ResultType {
    recurse(n.parameters);
    recurse(n.receiver);
    const prmEnt = mNodeEntitySet.entityOf(n.parameters);
    const recEnt = mNodeEntitySet.entityOf(n.receiver);
    if (!prmEnt || !recEnt)
      {}

    const { entity } = CallEntityBuild.make(n.callName, recEnt!, prmEnt!, );
    if (!entity())
      {}

    mNodeEntitySet.append(n, entity()!);
  }

  function visitFunctionDefinition(node: AstDefinitionNode): ResultType {
    const cns = contextNamesFor(node);
    const baseStage = baseStageFor(node);
    // const uac: UsedAncestorCollection = usedAncestorsCollectionFor(node);
    
    // const typeStage = baseStage.typingStage(cns, uac, mAssociations);
    // const contextType = typeStage.referenceType();
    const contextType = baseStage.writableReferenceType();
    // if (!contextType)
    //   { return; }

    // have to net up everything else too...
    // addFullyNamedContext(node, contextType.name(), contextType);
    // then at some point... a context completion task!

    // then go deeper!
    node.nodes.forEach(recurse);
  }
  function recurse(node: AstNode) { node.visit(mVisitor); }
  const mVisitor = freeze({
    visitLiteral,
    visitFringe,
    visitTuple,
    visitInitializer,
    visitCall,
    visitFunctionDefinition
  });
}
