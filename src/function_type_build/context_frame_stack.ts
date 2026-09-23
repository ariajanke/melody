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

import { FunctionTypeBuild, ObjectType } from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { AstNode } from '../ast_node';
import { ReceiverResolution } from './context_build';

const { freeze } = Helpers;

export interface ContextFrameSnapshot {
  receiverResolution(): ReceiverResolution;
  referenceType(): ObjectType;
  uniqueName(): string;
  intoBuildFor(node: AstNode): FunctionTypeBuild;
};

export interface ContextFrameStack {
  atDepth(idx: number): ContextFrameSnapshot | undefined;
  topFrame(): ContextFrameSnapshot;
  depth(): number;
  intoBuildFunction(): (node: AstNode) => FunctionTypeBuild;
};

export interface WritableContextFrameStack extends ContextFrameStack {
  // TODO deference can be a foot gun here!
  withBaseReferenceType<T>(snapshot: ContextFrameSnapshot, fn: () => T): T;
};

export const ContextFrameStack = freeze({
  make(mIntoFunctionTypeBuild: (node: AstNode) => FunctionTypeBuild)
    : WritableContextFrameStack
  {
    const mStack: ContextFrameSnapshot[] = [];

    function withBaseReferenceType<T>
      (snapshot: ContextFrameSnapshot, 
       fn: () => T): T
    {
      mStack.push(snapshot);
      const result = fn();
      mStack.pop();
      return result;
    }

    const topFrameAssertless = () => mStack[mStack.length - 1];

    const topFrame = () =>
      topFrameAssertless() ?? raise('stack is empty');

    function intoBuildFunction() {
      return topFrameAssertless()?.intoBuildFor ?? mIntoFunctionTypeBuild;
    }

    return freeze({
      depth: () => mStack.length,
      atDepth: (idx: number): ContextFrameSnapshot | undefined =>
        mStack[(mStack.length - 1) - idx],
      withBaseReferenceType,
      topFrame,
      intoBuildFunction
    });
  }
});
