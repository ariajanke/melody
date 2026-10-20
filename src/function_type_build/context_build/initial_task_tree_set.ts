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

import { Helpers, raise } from '../../helpers';
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
import { EntityBuild, FringeEntity } from '../fringe_entity';
import { CallEntity } from '../call_entity';
import { LiteralEntity } from '../literal_entity';
import { ConstantEntity, ObjectType } from '../../melody_components';
import { EndToEndHelpers } from '../../../tests/end_to_end_helpers';
import { DeclarationShiftTask } from './declaration_shift';
import { ReceiverResolution } from '../context_build';
import { TupleEntityBuild } from '../tuple_entity';
import { InitializerEntity } from '../initializer_entity';

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
  
  const mCurrentContext = (): ObjectType => raise(`don't call me`);
  const mCurrentRecRes = (): ReceiverResolution => raise(`don't call me`);
  type ResultType = void;
  function visitLiteral(litNode: AstLiteralNode): ResultType {
    mNodeEntitySet.append( litNode, LiteralEntity.make(litNode) );
  }

  function visitFringe(n: AstIdentifierNode): ResultType { 
    const ent = FringeEntity.make(n, mCurrentContext, mCurrentRecRes);
    mNodeEntitySet.append( n, ent );
  }

  function visitTuple(n: AstTupleNode): ResultType {
    n.nodes.forEach(recurse);
    const ent = TupleEntityBuild.make(n, mNodeEntitySet);
    mNodeEntitySet.append( n, ent );
  }
  function visitInitializer(n: AstInitializerNode): ResultType {
    recurse(n.valueNode);
    mContextShiftTasks.push(DeclarationShiftTask.make(n));
    mNodeEntitySet.append(n, InitializerEntity.make(n, mCurrentContext, mNodeEntitySet));
  }
  function visitCall(n: AstCallNode): ResultType {
    recurse(n.parameters);
    recurse(n.receiver);

    const prmEnt = mNodeEntitySet.entityOf(n.parameters);
    const recEnt = mNodeEntitySet.entityOf(n.receiver);
    if (!prmEnt || !recEnt)
      { raise('parameters and receiver should have been added'); }

    const ent = CallEntity.make(n.callName, recEnt!, prmEnt!, mCurrentRecRes);
    mNodeEntitySet.append(n, ent);
  }

  function visitFunctionDefinition(node: AstDefinitionNode): ResultType {
    // builds -> task -> builds -> task -> usw
    const baseStage = baseStageFor(node);
    
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
