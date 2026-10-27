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

import { AstDefinitionNode, AstNode } from '../../ast_node';
import { Helpers, raise, StandardErrorMessage } from '../../helpers';
import {
  CodeEmission,
  ConstantEntity,
  FunctionLookUpTable,
  FunctionType,
  ObjectType
} from '../../melody_components';
import { ReceiverResolution } from '../context_build';
import { ContextNamesTreeSet } from '../context_names_tree_set';
import { EntityBuild } from '../fringe_entity';
import { FunctionTypeAssociationSet, FunctionTypeFactory } from '../function_type_association_set';
import { ReceiverResolution_ } from './receiver_resolution';
import { TreeWideAncestorSet } from './tree_wide_ancestor_set';
import { ProgressiveVariableAllocation, VariableAllocation } from './variable_allocation';

// using the task architecture
// we can have:
// - context shift tasks
// - context completion tasks
// between tasks we can execute state changes

export interface ProtoFunctionType {
  receiver(): ObjectType;
  parameters(): ObjectType;
  returns(): ObjectType;
};

export interface ContextShiftAssociations {
  additionalMethods(): Readonly<Readonly<[string, FunctionType]>[]>;
  // design sin: trying to plan too far into the future
  // additionalLookUps(): Readonly<Readonly<[string, FunctionLookUpTable]>[]>;
};

export interface ContextShift {
  associations(): ContextShiftAssociations | undefined;
  additions(): ContextTaskAdditions | undefined;

  // NOTE absence here not evidence of an error
  allocations(): Readonly<Readonly<[string, ObjectType]>[]> | undefined;

  error(): StandardErrorMessage;
};

export interface ContextTaskAdditions extends FunctionTypeFactory {
  makeDeferredEmissionFor(
    context: ObjectType, ftype: FunctionType, task: DeferredEmissionTask): void;
};

export interface NodeEntitySet {
  entityOf(node: AstNode): ConstantEntity;
};

export interface MutableNodeEntitySet extends NodeEntitySet {
  append(node: AstNode, entity: ConstantEntity): MutableNodeEntitySet;
};

// a task that starts on a "let" statement
// not a true task
export interface ContextShiftTask {
  readonly type: 'context-shift';
  // though "dependencies" here are still crucial
  dependencies(): 'bag-of-stuff';
  run(
    // context: ObjectType,
    // v this factory must be able to "pre-associate" ftypes with immediates
    additions: ContextTaskAdditions,
    set: NodeEntitySet): ContextShift;
};

export interface DeferredEmissionTask {
  // made with the to-be-associated ftype
  run(allocations: VariableAllocation): Readonly<[FunctionType, CodeEmission][]> | StandardErrorMessage;
};

// a task that starts on a function definition close
//
// we have to complete the context type, but by no means do we need to run any
// emitter tasks
// export interface ContextTypeCompletionTask {
//   readonly type: 'context-type-completion';
//   run(
//     context: ObjectType,
//     // ...and associations from previous/related tasks
//     // ...and naming information from initial pass
    
//   ): void;
// };

interface ContextInfo {
  contextType(): ObjectType;
  receiverResolution(): ReceiverResolution;
};

interface ContextAssignableNodeEntitySet extends NodeEntitySet {
  assignContextToNodesInside(ctx: ContextInfo, n: AstDefinitionNode): void;
};

interface FunctionTaskSet {
  readonly tasks: Readonly<ContextShiftTask[]>;
  readonly node: AstDefinitionNode;
};

function make
  (mTaskSets: Readonly<FunctionTaskSet[]>,
   mNodeEntitySet: ContextAssignableNodeEntitySet,
   mTreeWideAncestorCollection: TreeWideAncestorSet,
   mBaseStageNames: ContextNamesTreeSet

  )
{
  const mFunctionAssociations: FunctionTypeAssociationSet = FunctionTypeAssociationSet.make();
  const { freeze, memoize } = Helpers;
  const { contextNamesFor, baseStageFor } = mBaseStageNames;
  const { addFullyNamedContext, usedAncestorsCollectionFor } = mTreeWideAncestorCollection;
  const mDeferredEmissions: [FunctionType, DeferredEmissionTask, ObjectType][] = [];

  const mContextTypeToVarAlloc: { [oTypeUid: symbol]: VariableAllocation | undefined } = {};
  // task has a strict definition:
  // - holds the world (the AST/entities/components) constant
  // - produces information about *how* to mutate the world
  // - has access to "additionals" for creating relational objects and additional tasks
  // - "additionals" are considered both a parameter and return of a task
  // the task controller is in charge of:
  // - mutating the world (via associators)
  // - "stopping" task runs to have flow-control go back up, to resolve dependancies

  for (let idx = 0; idx < mTaskSets.length; ++idx) {
    // shared set of things to do before and after...
    const orderedAllocations: Readonly<[string, ObjectType]>[] = [];
    const taskSet = mTaskSets[idx];
    const taskLen = taskSet.tasks.length;
    const wobj = baseStageFor(taskSet.node).writableReferenceType();
    const uac = usedAncestorsCollectionFor(taskSet.node);
    mNodeEntitySet.assignContextToNodesInside(freeze({
      contextType: (): ObjectType => wobj,
      receiverResolution: memoize((): ReceiverResolution => ReceiverResolution_.make(uac, wobj))
    }), taskSet.node);
    // receiver resolution derived from UAC...
    // we have to somehow plugin to our entities
    let taskAdditions: ContextTaskAdditions = freeze({
      ...mFunctionAssociations,
      makeDeferredEmissionFor(ftype: FunctionType, task: DeferredEmissionTask): void {
        mDeferredEmissions.push([ftype, task, wobj]);
      }
    });
    for (let jdx = 0; jdx < taskLen; ++jdx) {
      const task = taskSet.tasks[jdx];
      // have to keep in mind any time we call a "run" method
      // we'll need to refactor this such that a run can be called one at a time
      // from some public method
      task.dependencies();
      const shift = task.run(taskAdditions, mNodeEntitySet);
      if (shift.allocations()) {
        orderedAllocations.push(...shift.allocations()!);
      }
      if (shift.associations()) {
        const { additionalLookUps, additionalMethods } = shift.associations()!;
        additionalLookUps().
          forEach(([name, tbl]: Readonly<[string, FunctionLookUpTable]>) =>
            wobj.setFunctionLookUp(name, tbl));
        additionalMethods().
          forEach(([name, ftype]: Readonly<[string, FunctionType]>) =>
            wobj.setFunctionType(name, ftype));
      } else {
        // record error -> probably should live on the tree
        shift.error();
      }
      taskAdditions = shift.additions() ?? taskAdditions;
      
    }
    // need this for UAC
    contextNamesFor(taskSet.node);
    // this enables UACs for child defs
    addFullyNamedContext(taskSet.node, wobj.name(), wobj);

    // also something arguably part of context completion
    const pva = orderedAllocations.reduce((pva: ProgressiveVariableAllocation, [vname, obj]: Readonly<[string, ObjectType]>): ProgressiveVariableAllocation => {
      return pva.next(vname, obj);
    }, VariableAllocation.make());
    mContextTypeToVarAlloc[wobj.uid()] = pva;
  }
  // these deferred tasks do not need to be shared...
  for (let idx = 0; idx < mDeferredEmissions.length; ++idx) {
    const [ftype, task, context] = mDeferredEmissions[idx];
    const varAlloc = mContextTypeToVarAlloc[context.uid()] ?? raise('oh no!');
    const codeEm = task.run(context, varAlloc);
    if ('message' in codeEm) {
      // do something with the error?!
    } else {
      mFunctionAssociations.associate(ftype, codeEm);
    }
  }
  // once that's finished, we can get code ems from body nodes
  // wrap those bodies with prefaces and clean ups
  // then register
  // then finish compiling!
}
