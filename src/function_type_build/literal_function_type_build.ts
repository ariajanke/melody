import { CodeWriter } from '../code_writer';
import { Helpers } from '../helpers';
import { ConstantStringType, IntegerType } from './builtin_type';
import { FunctionTypeBase } from './function_type_base';
import { FunctionTypeBuildBase } from './function_type_build_base';

const { freeze } = Helpers;

const klass = freeze({
  makeForInteger: (int_: string) => {
    const ftype = freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      returns: IntegerType.instance,
      simpleEmit(writer: CodeWriter) {
        return writer.pushLiteralString(int_);
      }
    });

    return FunctionTypeBuildBase.makeSuccessFromType(ftype);
  },
  makeForString: (string_: string) => {
    string_ = string_.slice(1, -1);
    const ftype = freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      returns: ConstantStringType.instance,
      simpleEmit(writer: CodeWriter) {
        return writer.pushLiteralString(string_);
      }
    });

    return FunctionTypeBuildBase.makeSuccessFromType(ftype);
  }
});

export const LiteralFunctionTypeBuild = klass;
