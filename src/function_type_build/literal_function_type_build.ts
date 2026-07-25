import { CodeWriter } from '../code_writer';
import { Helpers } from '../helpers';
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
        writer.pushLiteralString(int_)
    })),
  makeForString: (string_: string) => {
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
