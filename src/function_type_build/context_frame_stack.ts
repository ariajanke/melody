import { DastFunctionNameMappings, DastNode } from '../dast_build';
import { FunctionTypeBuild, ObjectType } from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { ReceiverResolution } from './context_build';

const { freeze } = Helpers;

export interface ContextFrameSnapshot {
  receiverResolution(): ReceiverResolution;
  referenceType(): ObjectType;
  aggregateType(): ObjectType | 'not ready';
  uniqueName(): string;
};

export interface ContextFrameStack {
  findWhereDeclared(pendingName: string): ObjectType;
  hopCountFor(pendingName: string): number;
  contextForHop(idx: number): ContextFrameSnapshot | undefined;

  // top(): {};
};

export interface WritableContextFrameStack {
  withBaseReferenceType<T>(snapshot: ContextFrameSnapshot, fn: () => T): T;
};

export const ContextFrameStack = freeze({
  // TODO possibly misleading
  kHopsToParent: 0,
  make(mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild): WritableContextFrameStack
  {
    const mStack: ContextFrameSnapshot[] = [];
    let mNameCacheThing: { [name: string]: number | undefined } = {};

    function nameCacheLookup(pendingName: string): number | undefined {
      const thing = mNameCacheThing[pendingName];
      if (thing)
        { return thing; }

      for (let i = mStack.length - 1; i >= 0; i--) {
        if (mStack[i].referenceType().lookUp(pendingName)) {
          mNameCacheThing[pendingName] = i;
          if (i === mStack.length - 1) {
            raise(`pending name "${pendingName}" should be a declared name ` +
                  `instead of a pending name`);
          }
          return i;
        }
      }
      return undefined;
    }

    function findWhereDeclared(pendingName: string): ObjectType {
      const idx = nameCacheLookup(pendingName);
      if (idx === undefined) {
        raise(`pending name "${pendingName}" is not declared in any context`);
      }
      return mStack[idx].referenceType();
    }

    function hopCountFor(pendingName: string): number {
      const idx = nameCacheLookup(pendingName);
      if (idx === undefined) {
        raise(`pending name "${pendingName}" is not declared in any context`);
      }
      return (mStack.length - 1) - idx;
    }

    function contextForHop(hop: number): ContextFrameSnapshot | undefined {
      return mStack[mStack.length - 1 - hop];
    }

    function withBaseReferenceType<T>
      (snapshot: ContextFrameSnapshot, 
       fn: () => T): T
    {
      mStack.push(snapshot);
      mNameCacheThing = {};
      const result = fn();
      mStack.pop();
      return result;
    }

    return freeze({
      contextForHop,
      hopCountFor,
      withBaseReferenceType,
      findWhereDeclared
    });
  }
});
