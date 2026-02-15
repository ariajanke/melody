import { CodeWriter } from '../code_writer';
import { FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { Helpers } from '../helpers';
import { StringPoolBuilder } from '../string_pool';
import { ConstantStringType, IntegerType } from './builtin_type';
import { FunctionTypeBuildBase } from './function_type_build_base';
import { TupleObjectFactory } from './tuple_type';

const { freeze, memoize } = Helpers;

function makeFunctionType
  (mRepresentation: number, mType: ObjectType): FunctionType
{
  return freeze({
    parameters(): ObjectType { return TupleObjectFactory.emptyTuple(); },
    returns(): ObjectType { return mType; },
    emit(writer: CodeWriter) {
      return writer.pushRepresentation(mRepresentation);
    },
    uid: memoize(Symbol)
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
