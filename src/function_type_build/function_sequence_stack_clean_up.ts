import { CodeWriter } from '../code_writer';
import { FunctionType, FunctionTypeBuild } from '../function_type_build';
import { Helpers, StandardError } from '../helpers';
import { FunctionTypeBase } from './function_type_base';
import { TupleObjectFactory } from './tuple_type';

const { freeze, memoize } = Helpers;

function make
  (mBuildSequence: readonly FunctionTypeBuild[]): FunctionTypeBuild
{
  const { error, setErrorFn } = StandardError.make();

  function functionTypeSequence() {
    return mBuildSequence.
      map((build: FunctionTypeBuild) => {
        const ftype = build.functionType();
        return ftype ?? setErrorFn(build.error);
      }).
      reduce((acc: FunctionType[] | undefined,
              ftype: FunctionType | undefined): FunctionType[] | undefined =>
      {
        if (!acc || !ftype) { return undefined; }

        const rt = ftype.returns();
        if (rt.uid() === TupleObjectFactory.emptyTuple().uid()) {
          acc.push(ftype);
        } else {
          acc.push(ftype, ftype.returns().stackCleanUp());
        }

        return acc;
      }, [] as FunctionType[] | undefined); 
  }

  const functionType = memoize(() => {
    const functionTypes = functionTypeSequence();
    return functionTypes && freeze({
      ...FunctionTypeBase.receivedByNone(),
      emit(writer: CodeWriter) {
        functionTypes.forEach((ft: FunctionType) => ft.emit(writer));

        // NOTE recall that the receiver is an argument for WASM
        //      so no clean up is needed
        return writer;
      }
    });
  });

  return freeze({ functionType, error });
}

export const FunctionSequenceStackCleanUp = freeze({ make });
