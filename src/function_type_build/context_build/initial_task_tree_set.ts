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
import { TreeWideAncestorSet } from './tree_wide_ancestor_set';
import { ContextShiftTask, ContextTaskAdditions, MutableNodeEntitySet, NodeEntitySet } from './task_controller';
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
import { ReceiverResolution_ } from './receiver_resolution';
import { MemoryAluWriter } from '../../wasm_compilation/melody_code_writer/memory_alu_writer';
import { DefinitionEntityFactory } from '../definition_entity_factory';

const { freeze, memoize } = Helpers;

interface ContextInfo {
  contextType(): ObjectType;
  receiverResolution(): ReceiverResolution;
};

type MutableContextInfo = {
  contextTypeFn: () => ObjectType;
  receiverResolution: () => ReceiverResolution;
};

interface ContextAssignableNodeEntitySet extends NodeEntitySet {
  assignContextToNodesInside(ctx: ContextInfo, n: AstDefinitionNode): this;
};

interface FunctionTaskSet {
  readonly tasks: Readonly<ContextShiftTask[]>;
  readonly node: AstDefinitionNode;
};

// this is wrong
// function makeSomeSharedThing
//   (mNodeEntitySet: ContextAssignableNodeEntitySet,
//    mTreeWideAncestorCollection: TreeWideAncestorSet,
//    mBaseStageNames: ContextNamesTreeSet,
//    mDefNode: AstDefinitionNode,
//    mFunctionAssociations: FunctionTypeAssociationSet
//   )
// {
//   const { freeze, memoize } = Helpers;
//   const { contextNamesFor, baseStageFor } = mBaseStageNames;
//   const { addFullyNamedContext, usedAncestorsCollectionFor } = mTreeWideAncestorCollection;
//   const writableContextType = memoize(() =>
//     baseStageFor(mDefNode).writableReferenceType());
//   const nodeEntitySet = memoize(() => {
//     const wobj = baseStageFor(mDefNode).writableReferenceType();
//     const uac = usedAncestorsCollectionFor(mDefNode);
//     return mNodeEntitySet.assignContextToNodesInside(freeze({
//       contextType: writableContextType as () => ObjectType,
//       receiverResolution: memoize((): ReceiverResolution =>
//         ReceiverResolution_.make(uac, writableContextType()))
//     }), mDefNode);
//   });
//   const contextTaskAdditions = memoize((): ContextTaskAdditions => freeze({
//     ...mFunctionAssociations,
//     makeDeferredEmissionFor(ftype: FunctionType, task: DeferredEmissionTask): void {
//       mDeferredEmissions.push([ftype, task, writableContextType()]);
//     }
//   }));
// }

function makeBaseContextShift
  (mTaskSet: FunctionTaskSet,
   mAllocations: Readonly<[string, ObjectType]>[]
  )
{

}

interface InitialTaskTreeSet {
  taskSets(): Readonly<FunctionTaskSet[]>;
  nodeEntitySet(): ContextAssignableNodeEntitySet;
};
const kDefaultContextObjFn = (): ObjectType => raise(`don't call me`);
const kDefaultRecResFn = (): ReceiverResolution => raise(`don't call me`);

// this should consume a ContextBaseNamesSet instance completely
function make
  (mRoot: AstDefinitionNode,
   mNodeEntitySet: MutableNodeEntitySet,
   mDefFactory = DefinitionEntityFactory.make())
  : InitialTaskTreeSet
{
  const mTaskSets: FunctionTaskSet[] = [];
  let mCurrentContext: ConstantEntity | undefined = undefined;
  const mContextShiftTasks: ContextShiftTask[] = [];
  // const mDefNodeToInfoMap: { [nodeUid: number]: MutableContextInfo | undefined } = {};
  // function getContextInfo(defNode: AstDefinitionNode): MutableContextInfo {
  //   return mDefNodeToInfoMap[defNode.uid()] ??= ({
  //     contextTypeFn: kDefaultContextObjFn,
  //     receiverResolution: kDefaultRecResFn
  //   });
  // }
  const getCurrentContext = (): ConstantEntity =>
    mCurrentContext ?? raise('AST has is not rooted in a def node!');
  type ResultType = void;
  function visitLiteral(litNode: AstLiteralNode): ResultType {
    mNodeEntitySet.append( litNode, LiteralEntity.make(litNode) );
  }

  function visitFringe(n: AstIdentifierNode): ResultType {
    const ent = FringeEntity.make(n, getCurrentContext());
    mNodeEntitySet.append( n, ent );
  }

  function visitTuple(n: AstTupleNode): ResultType {
    n.nodes.forEach(recurse);
    const ent = TupleEntityBuild.make(n, mNodeEntitySet);
    mNodeEntitySet.append( n, ent );
  }
  function visitInitializer(n: AstInitializerNode): ResultType {
    recurse(n.valueNode);
    mContextShiftTasks.push(DeclarationShiftTask.make(n, getCurrentContext()));
    // const { contextTypeFn } = getCurrentContextInfo();
    mNodeEntitySet.append(n, InitializerEntity.make(n, contextTypeFn, mNodeEntitySet));
  }
  function visitCall(n: AstCallNode): ResultType {
    recurse(n.parameters);
    recurse(n.receiver);

    const prmEnt = mNodeEntitySet.entityOf(n.parameters);
    const recEnt = mNodeEntitySet.entityOf(n.receiver);
    if (!prmEnt || !recEnt)
      { raise('parameters and receiver should have been added'); }
    // const { receiverResolution } = getCurrentContextInfo();

    const ent = CallEntity.make(n.callName, recEnt!, prmEnt!, receiverResolution);
    mNodeEntitySet.append(n, ent);
  }

  function visitFunctionDefinition(node: AstDefinitionNode): ResultType {
    mCurrentContext = mDefFactory.entityOf(node);
    mNodeEntitySet.append( node, mCurrentContext );
    node.nodes.forEach(recurse);
    mTaskSets.push(freeze({
      node,
      tasks: mContextShiftTasks.slice() // clone it!
    }));
    mContextShiftTasks.length = 0;
    
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

  const taskSets = memoize((): Readonly<FunctionTaskSet[]> => {
    mRoot.visit(mVisitor);
    return mTaskSets;
  });

  const nodeEntitySet = memoize((): ContextAssignableNodeEntitySet => {
    const set_ = freeze({
      ...mNodeEntitySet,
      assignContextToNodesInside: mDefFactory.associate,
    });
    return set_;
  });

  return freeze({ taskSets, nodeEntitySet });
}

export const InitialTaskTreeSet = freeze({ make });
