import { CodeWriter } from '../code_writer';
// import { FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { Helpers } from '../helpers';
// import { StringPoolBuilder } from '../string_pool';
import { ConstantStringType, IntegerType } from './builtin_type';
import { FunctionTypeBase } from './function_type_base';
import { FunctionTypeBuildBase } from './function_type_build_base';

const { freeze } = Helpers;

// function makeFunctionType
//   (mRepresentation: number, mType: ObjectType): FunctionType
// {
//   return freeze({
//     ...FunctionTypeBase.makeNewEmitlessEmpty(),
//     returns: (): ObjectType => mType,
//     simpleEmit(writer: CodeWriter) {
//       return writer.pushRepresentation(mRepresentation);
//     }
//   });
// }

const klass = freeze({
  // make(mRepresentation: number, mType: ObjectType): FunctionTypeBuild {
  //   return FunctionTypeBuildBase.makeSuccessFromType(makeFunctionType(mRepresentation, mType));

  //   return freeze({
  //     ...FunctionTypeBase.makeNewEmitlessEmpty(),
  //     returns: ConstantStringType.instance,
  //     simpleEmit(writer: CodeWriter) {
  //       return writer.pushLiteralString(string_);
  //     }
  //   });
  // },
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
