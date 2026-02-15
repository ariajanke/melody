import { InterpretedCodeWriter } from './interpreted_code_writer';
import { Helpers } from '../helpers';

const { freeze } = Helpers;

type Injections = ReturnType<typeof InterpretedCodeWriter.defaultInjections>;

export const StackSafetyWatcher = freeze({
  make(makeStack: Injections['makeStack']) {
    const mJumpStack = makeStack(() => 0);
    const mStackSizeStack = makeStack(() => 0);
    return freeze({
      pushReturnPoint(to: number, currentStackSize: number): number {
        mJumpStack.push(to);
        // NOTE
        // indirect call will consume additionally the receiver and function index
        mStackSizeStack.push(currentStackSize - 1);
        return to;
      },
      popReturnPoint(currentStackSize: number): number | undefined {
        if (mJumpStack.isEmpty()) {
          if (currentStackSize !== 0) {
            throw new Error('Stack not empty at end of program');
          }
          return undefined;
        }
        const expectedStackSize = mStackSizeStack.pop();
        if (expectedStackSize === undefined) {
          throw new Error('This class is not doing its job');
        }
        if (currentStackSize !== expectedStackSize) {
          throw new Error(`Stack size mismatch at jump point, expected ${expectedStackSize} but got ${currentStackSize}`);
        }
        return mJumpStack.pop();
      }
    });
  }
});
