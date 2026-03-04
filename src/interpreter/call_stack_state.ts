import { InterpretedCodeWriter } from './interpreted_code_writer';
import { Helpers, raise } from '../helpers';

const { freeze } = Helpers;

type Injections = ReturnType<typeof InterpretedCodeWriter.defaultInjections>;

export const CallStackState = freeze({
  make(makeStack: Injections['makeStack']) {
    const mJumpStack = makeStack(() => 0);
    const mStackSizeStack = makeStack(() => 0);
    const mLocalStackPointers = makeStack(() => 0);
    return freeze({
      forStackPointer(option: string, state: { stackPointer: number }) {
        if (option === 'saveToLocal') {
          mLocalStackPointers.pop();
          mLocalStackPointers.push(state.stackPointer);
        } else if (option === 'restoreToGlobal') {
          state.stackPointer = mLocalStackPointers.top();
        } else {
          raise(`Unknown option for forStackPointer: ${option}`);
        }
      },
      pushReturnPoint(to: number, currentStackSize: number): number {
        if (currentStackSize < 0) {
          raise('Negative stack size at pushReturnPoint');
        }
        mJumpStack.push(to);
        // NOTE
        // indirect call will consume additionally the receiver and function index
        mStackSizeStack.push(currentStackSize);
        console.log(`Pushing return point ${to} with expected stack size ${currentStackSize}`);
        mLocalStackPointers.push();
        return to;
      },
      popReturnPoint(currentStackSize: number): number | undefined {
        if (mJumpStack.isEmpty()) {
          if (currentStackSize !== 0) {
            raise('Stack not empty at end of program');
          }
          return undefined;
        }
        const expectedStackSize = mStackSizeStack.pop();
        if (expectedStackSize === undefined) {
          raise('This class is not doing its job');
        }
        if (currentStackSize !== expectedStackSize) {
          raise(`Stack size mismatch at jump point, expected ${expectedStackSize} but got ${currentStackSize}`);
        }
        mLocalStackPointers.pop();
        return mJumpStack.pop();
      }
    });
  }
});
