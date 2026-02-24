import { CodeWriter } from '../src/code_writer';
import { FunctionType } from '../src/function_type_build';
import { Helpers } from '../src/helpers';

const { freeze } = Helpers;

const kNoArgFuncName = [
  'askInteger',
  'askString',
  'printInteger',
  'printString',
  'addIntegers',
  'multiplyIntegers',
  'subtractIntegers',
  'loadInteger',
  'storeInteger',
  'saveStackPointerToLocal',
  'restoreStackPointerToGlobal',
  'setStackPointer',
  'pushStackPointer',
  'drop',
  'duplicateTop',
  'swapTopTwo',
] as const;

function getSimpleEmitCallsFrom(ftype: FunctionType | undefined): string[] {
  if (!ftype)
    { return []; }

  const calls: string[] = [];
  const cw = CallCountingCodeWriter.make(calls);
  ftype.simpleEmit(cw);
  return calls;
}

export const CallCountingCodeWriter = freeze({
  getSimpleEmitCallsFrom,
  make(mStrings: string[]): CodeWriter {
    const fs = Object.assign({}, ...kNoArgFuncName.
      map((v: typeof kNoArgFuncName[number]) => ({
        [v]: (): CodeWriter => {
          mStrings.push(v);
          return inst;
        }
      }))) as { [name in ActionName]: () => CodeWriter };
    type ActionName = typeof kNoArgFuncName[number];
    const inst = freeze({
      ... fs,
      pushInteger(num: number): CodeWriter {
        mStrings.push('pushInteger', `${num}`);
        return inst;
      },
      pushLiteralString(str: string): CodeWriter {
        mStrings.push('pushLiteralString', str);
        return inst;
      },
      indirectCall(beingCalled: FunctionType): CodeWriter {
        mStrings.push('indirectCall', String(beingCalled.uid()));
        return inst;
      },
      pushIndexOfRegistered(ftype: FunctionType): CodeWriter {
        mStrings.push('pushIndexOfRegistered', String(ftype.uid()));
        return inst;
      },
      withStackFrameSize<T>(size: number, fn: (cw: CodeWriter) => T): T {
        mStrings.push('withStackFrameSize', `${size}`);
        return fn(inst);
      },
      storeParentPointer(accessIndex: number): CodeWriter {
        mStrings.push('storeParentPointer', `${accessIndex}`);
        return inst;
      }
    });
    return inst;
  }
});
