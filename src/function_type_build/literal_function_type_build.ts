import { CodeWriter } from '../code_writer';
import { Helpers, raise } from '../helpers';
import { IntegerType } from './integer_type';
import { FunctionTypeBase } from './function_type_base';
import { FunctionTypeBuildBase } from './function_type_build_base';
import { ConstantStringType } from './builtin_type_base';
import { FunctionType, FunctionTypeBuild } from '../function_type_build';

const { freeze } = Helpers;

const klass = freeze({
  makeSuccessFromType: (ftype: FunctionType): FunctionTypeBuild =>
    FunctionTypeBuildBase.makeSuccessFromType(ftype),
  makeForInteger: (int_: string) =>
    klass.makeSuccessFromType(freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      returns: IntegerType.instance,
      simpleEmit: (writer: CodeWriter) =>
        writer.pushInteger(Number(int_))
    })),
  makeForString: (string_: string) => {
    const { length } = string_;
    if (length < 2 || string_[0] !== '\'' || string_[length - 1] != '\'') {
      raise(`Given value "${string_}" is not a valid string literal`);
    }
    string_ = string_.slice(1, -1);
    return klass.makeSuccessFromType(freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      returns: ConstantStringType.instance,
      simpleEmit: (writer: CodeWriter) =>
        writer.pushLiteralString(string_)
    }));
  }
});

export const LiteralFunctionTypeBuild = klass;
