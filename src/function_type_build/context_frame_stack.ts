import { DastNode } from '../dast_build';
import { FunctionTypeBuild, ObjectType } from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { ReceiverResolution } from './context_build';

const { freeze } = Helpers;

export interface ContextFrameSnapshot {
  receiverResolution(): ReceiverResolution;
  referenceType(): ObjectType;
  uniqueName(): string;
  intoBuildFor(node: DastNode): FunctionTypeBuild;
};

export interface ContextFrameStack {
  atDepth(idx: number): ContextFrameSnapshot | undefined;
  topFrame(): ContextFrameSnapshot;
  depth(): number;
  intoBuildFunction(): (node: DastNode) => FunctionTypeBuild;
};

export interface WritableContextFrameStack extends ContextFrameStack {
  // TODO deference can be a foot gun here!
  withBaseReferenceType<T>(snapshot: ContextFrameSnapshot, fn: () => T): T;
};

export const ContextFrameStack = freeze({
  make(mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild)
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
