import { CodeWriter } from './code_writer';
import { FunctionType } from './function_type_build';
import { Helpers } from './helpers';

const { freeze } = Helpers;

function oops(): never {
  throw new Error('This code writer exist purely to grab indices, this maybe misused');
}

export interface FunctionTypeIndexGrabber {
  grabFrom(functionType: FunctionType): number;
};

export const FunctionTypeIndexGrabber = freeze({
  make() {
    let mGottenIndex: number | undefined = undefined;
    const mPseudoWritter: CodeWriter = freeze({
      pushRepresentation(rep: number): CodeWriter {
        mGottenIndex = rep;
        return mPseudoWritter;
      },
      addIntegers: oops,
      askInteger: oops,
      askString: oops,
      printString: oops,
      printInteger: oops,
      drop: oops,
      multiplyIntegers: oops,
      subtractIntegers: oops,
      loadInteger(_0: number) { oops(); },
      storeInteger(_0: number) { oops(); },
      indirectCall(_0: number) { oops(); },
      pushStackPointer: oops
    });

    const inst = freeze({
      grabFrom(functionType: FunctionType): number {
        mGottenIndex = undefined;
        functionType.emit(mPseudoWritter);
        if (mGottenIndex === undefined) {
          throw new Error('index grabber failed to grab an index');
        }
        return mGottenIndex;
      }
    });
    return inst;
  }
});
