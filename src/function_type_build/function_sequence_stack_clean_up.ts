import { CodeWriter } from '../code_writer';
import { FunctionType, FunctionTypeBuild } from '../function_type_build';
import { Helpers, StandardError } from '../helpers';
import { TupleObjectFactory } from './tuple_type';

const { freeze, memoize } = Helpers;

function make
  (mBuildSequence: readonly FunctionTypeBuild[]): FunctionTypeBuild
{
  const { error, setErrorFn } = StandardError.make();
  const { emptyTuple } = TupleObjectFactory;

  const prefaceFunctionType = memoize((): FunctionType => {
    const { emptyTuple } = TupleObjectFactory;

    return freeze({
      parameters: () => emptyTuple(),
      returns: () => emptyTuple(),
      emit: (codeWriter: CodeWriter) =>
        codeWriter.storeParentStackPointer().forStackPointer('saveToLocal'),
      uid: memoize(Symbol)
    });
  });


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
        acc.push(ftype, ftype.returns().stackCleanUp());

        return acc;
      }, [prefaceFunctionType()] as FunctionType[] | undefined); 
  }

  const functionType = memoize(() => {
    const functionTypes = functionTypeSequence();
    return functionTypes && freeze({
      parameters: () => emptyTuple(),
      returns: () => emptyTuple(),
      emit(writer: CodeWriter) {
        functionTypes.forEach((ft: FunctionType) => ft.emit(writer));

        // NOTE recall that the receiver is an argument for WASM
        //      so no clean up is needed
        return writer;
      },
      uid: memoize(Symbol)
    });
  });

  return freeze({ functionType, error });
}

export const FunctionSequenceStackCleanUp = freeze({ make });
