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

import { Helpers, StandardErrorMessage } from '../../helpers';
import {
  CodeEmission,
  FunctionLookUpTable,
  FunctionType,
  ObjectType
} from '../../melody_components';
import { FunctionTypeFactory } from '../function_type_association_set';
import { VariableAllocation } from './variable_allocation';

// using the task architecture
// we can have:
// - context shift tasks
// - context completion tasks
// between tasks we can execute state changes
export interface ContextShiftAssociations {
  additionalMethods(): Readonly<[string, FunctionType][]>;
  additionalLookUps(): Readonly<[string, FunctionLookUpTable][]>;
};

export interface ContextShift {
  associations(): ContextShiftAssociations | undefined;
  allocations(): Readonly<[string, ObjectType][]> | undefined;
  error(): StandardErrorMessage;
};

export interface ContextTaskAdditions extends FunctionTypeFactory {
  makeDeferredEmissionFor(ftype: FunctionType, task: DeferredEmissionTask): void;
};

// a task that starts on a "let" statement
export interface ContextShiftTask {
  dependencies(): ;
  run(
    context: ObjectType,
    // v this factory must be able to "pre-associate" ftypes with immediates
    additions: ContextTaskAdditions): ContextShift;
};

export interface DeferredEmissionTask {
  // made with the to-be-associated ftype
  run(finishedContext: ObjectType,
      allocations: VariableAllocation): CodeEmission | StandardErrorMessage;
};

// a task that starts on a function definition close
//
// we have to complete the context type, but by no means do we need to run any
// emitter tasks
export interface ContextTypeCompletionTask {
  run(
    context: ObjectType,
    // ...and associations from previous/related tasks
    // ...and naming information from initial pass
  ): ;
};

function make
  (mTasks: (ContextShiftTask | ContextCompletionTask)[],
   
  )
{
  const mDeferredEmissions: [FunctionType, DeferredEmissionTask][] = [];
  function makeDeferredEmissionFor
    (ftype: FunctionType, task: DeferredEmissionTask): void
  {
    mDeferredEmissions.push([ftype, task]);
  }
  for (let i = 0; i < mTasks.length; ++i) {
    const task = mTasks[i];
    
    // if shift, then
    // - accumulate associations and allocations (and errors)
    // if completion, then
    // - allocate space for variables
    // - run deferred emission tasks, associating as needed
    // - preface/body content/clean-up emission
    // - register the function for WASM emission and index assignment
  }

}
