import { CodeWriter } from '../code_writer';
import { FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { Helpers } from '../helpers';
import { StringPoolBuilder } from '../string_pool';
import { ConstantStringType, IntegerType } from './builtin_type';
import { FunctionTypeBase } from './function_type_base';
import { FunctionTypeBuildBase } from './function_type_build_base';

const { freeze } = Helpers;

function makeFunctionType
  (mRepresentation: number, mType: ObjectType): FunctionType
{
  return freeze({
    ...FunctionTypeBase.receivedByNone(),
    returns: (): ObjectType => mType,
    emit(writer: CodeWriter) {
      return writer.pushRepresentation(mRepresentation);
    }
  });
}

const klass = freeze({
  make(mRepresentation: number, mType: ObjectType): FunctionTypeBuild {
    return FunctionTypeBuildBase.makeSuccessFromType(makeFunctionType(mRepresentation, mType));
  },
  makeForInteger: (int_: string) =>
    klass.make(Number(int_), IntegerType.instance()),
  makeForString: (string_: string, stringPoolBuilder: StringPoolBuilder) => {
    const rep = stringPoolBuilder.append(string_.slice(1, -1));
    return klass.make(rep, ConstantStringType.instance());
  }
});

export const LiteralFunctionTypeBuild = klass;
