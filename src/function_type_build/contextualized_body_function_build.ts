import { CodeWriter } from '../code_writer';
import { FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { Helpers, StandardError } from '../helpers';
import { AstNode } from '../ast_node';
import { FunctionTypeBase } from './function_type_base';

const { freeze, memoize } = Helpers;

function make
  (mPreface: FunctionType,
   mAggregateType: ObjectType,
   mNodes: Readonly<AstNode[]>,
   mIntoFunctionTypeBuild: (node: AstNode) => FunctionTypeBuild)
  : FunctionTypeBuild
{
  const { error, setErrorFn } = StandardError.make();

  const builtFunctionTypes = memoize((): FunctionType[] | undefined => mNodes.
    map(mIntoFunctionTypeBuild).
    reduce((prev: FunctionType[] | undefined, build: FunctionTypeBuild) => {
      if (!prev)
        { return undefined; }

      if (build.functionType()) {
        prev.push(build.functionType()!);
        return prev;
      }

      return setErrorFn(build.error);
    }, [] as (FunctionType[])| undefined));

  const itemsLeftOnStackCount = (() =>
    builtFunctionTypes()!.
    reduce((n: number, ftype: FunctionType) =>
      n + ftype.returns().sizeInStackItems(), 0));

  const { sizeInBytes } = mAggregateType;

  const functionType = memoize(() => {
    const ftypes = builtFunctionTypes();
    if (!ftypes)
      { return undefined; }

    const itemsLeft = itemsLeftOnStackCount();

    const simpleEmit = (writer: CodeWriter) => {
      writer.withStackFrameSize(sizeInBytes(), (writer: CodeWriter) => {
        mPreface.simpleEmit(writer);
        for (let i = 0; i < ftypes.length; ++i) {
          ftypes[i].simpleEmit(writer);
        }
        for (let i = 0; i < itemsLeft; ++i) {
          writer.drop();
        }
      });
    };

    return freeze({ ...FunctionTypeBase.makeNewEmitlessEmpty(), simpleEmit });
  });

  return freeze({ functionType, error });
}

export const ContextualizedBodyFunctionBuild = freeze({ make });
