import { CodeWriter } from '../code_writer';
import { FunctionType, FunctionTypeBuild } from '../function_type_build';
import { Helpers, StandardError } from '../helpers';
import { AstNode } from '../ast_node';
import { FunctionTypeBase } from './function_type_base';
import { TupleObjectType } from './tuple_object_type';

const { freeze, memoize } = Helpers;

function make
  (mNodes: Readonly<AstNode[]>,
   mIntoFunctionTypeBuild: (node: AstNode) => FunctionTypeBuild)
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
    if (mNodes.length === 0)
      { return FunctionTypeBase.emitEmptyTuple(); }

    if (!functionTypesFromNodes())
      { return; }

    const ftypeReturns = memoize(() => TupleObjectType.
      instanceFor(functionTypesFromNodes()!.map(ft => ft.returns())));

    return freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      returns: ftypeReturns,
      simpleEmit(writer: CodeWriter) {
        reversedFunctionTypes()!.
          forEach((ft: FunctionType) => ft.simpleEmit(writer));
        return writer;
      }
    });
  });
  
  return freeze({ functionType, error });
}

export const TupleFunctionBuild = freeze({ make });
