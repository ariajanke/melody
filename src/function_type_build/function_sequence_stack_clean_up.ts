import { CodeWriter } from '../code_writer';
import { FunctionType, FunctionTypeBuild } from '../function_type_build';
import { Helpers, StandardError } from '../helpers';
import { FunctionTypeBase } from './function_type_base';

const { freeze, memoize } = Helpers;

function make
  (mBuildSequence: Readonly<FunctionTypeBuild[]>): FunctionTypeBuild
{
  const { error, setErrorFn } = StandardError.make();

  const itemsLeftOnStackCount = memoize((): number | undefined =>
    mBuildSequence.
      map((build: FunctionTypeBuild) => {
        const ftype = build.functionType();
        return ftype ?? setErrorFn(build.error);
      }).
      reduce((acc: number | undefined,
              ftype: FunctionType | undefined): number | undefined =>
      {        
        if (acc === undefined)
          { return undefined; }

        const count = ftype?.returns().sizeInStackItems();
        if (count === undefined)
          { return count; }

        return count + acc;
      }, 0));

  const functionType = memoize(() => {
    if (itemsLeftOnStackCount() === undefined)
      { return undefined; }

    return freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      simpleEmit(writer: CodeWriter) {
        for (let i = 0; i < itemsLeftOnStackCount()!; ++i) {
          writer.drop();
        }

        // NOTE recall that the receiver is an argument for WASM
        //      so no clean up is needed
        return writer;
      }
    });
  });

  return freeze({ functionType, error });
}

/// clean up a dirty WASM stack, should it be left dirty
export const FunctionSequenceStackCleanUp = freeze({ make });
