import { CodeWriter } from '../code_writer';
import { DastNode } from '../dast_build';
import { FunctionType, FunctionTypeBuild } from '../function_type_build';
import { Helpers, StandardError } from '../helpers';
import { FunctionTypeBase } from './function_type_base';
import { TupleObjectFactory } from './tuple_type';

const { freeze, memoize } = Helpers;

function make
  (mNodes: Readonly<DastNode[]>,
   mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild)
  : FunctionTypeBuild
{
  const { error, setErrorFn } = StandardError.make();

  const functionTypesFromNodes = memoize(()
    : Readonly<FunctionType[]> | undefined =>
  {
    const fts: FunctionType[] = [];
    for (const node of mNodes) {
      const build = mIntoFunctionTypeBuild(node);
      const ftype = build.functionType();
      if (!ftype)
        { return setErrorFn(build.error); }
      fts.push(ftype);
    };
    return fts;
  });

  const reversedFunctionTypes = memoize(() =>
    functionTypesFromNodes()?.slice().reverse());

  const functionType = memoize((): FunctionType | undefined => {
    if (!functionTypesFromNodes())
      { return; }
    return freeze({
      ...FunctionTypeBase.receivedByNone(),
      returns: memoize(() => TupleObjectFactory.
        make(functionTypesFromNodes()!.map(ft => ft.returns()))),
      emit(writer: CodeWriter) {
        reversedFunctionTypes()!.
          forEach((ft: FunctionType) => ft.emit(writer));
        return writer;
      }
    });
  });
  
  return freeze({
    functionType,
    error
  });
}

export const TupleFunctionTypeBuild = freeze({ make });
