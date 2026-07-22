import { CodeWriter } from '../code_writer';
import { FunctionNamingSchema } from '../function_naming_schema';
import { FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { StackSafetyChecker } from './stack_safety_checker';
import { Helpers, StandardError } from '../helpers';
import { FunctionTypeBase } from './function_type_base';
import { ContextFrameSnapshot } from './context_frame_stack';

const { freeze, memoize } = Helpers;

// builds the whole "let a := stuff"
// after "<initSet>:(a)" has been added
export const InitialSetFunctionBuild = freeze({
  make(mNamesDefined: readonly string[] | string, 
       mArgsBuild: FunctionTypeBuild,
       mTopFrame: ContextFrameSnapshot)
      //  mTopContextType: () => ObjectType)
      : FunctionTypeBuild
  {
    const { error, setErrorFn } = StandardError.make();
    const argsFType = memoize(() =>
      mArgsBuild.functionType() ?? setErrorFn(mArgsBuild.error));
    const initialSetter = memoize(() => {
      if (!argsFType())
        { return; }
      const initialSetName = FunctionNamingSchema.
        mapToInitialSetName(mNamesDefined);
      return mTopContextType().
        lookUp( initialSetName )?.
        byParameters( argsFType()!.returns() ) ?? (() => {
          throw new Error(`Cannot find "${initialSetName}"`);
        })();
    });

    const functionType = memoize(() => {
      if (!initialSetter())
        { return; }

      const compositeFunctionType: FunctionType = freeze({
        ...FunctionTypeBase.makeNewEmitlessEmpty(),
        simpleEmit(writer: CodeWriter) {
          // no "receiver"
          argsFType()!.emit(writer);
          initialSetter()!.emit(writer);
          return writer;
        }
      });
      StackSafetyChecker.make().check(compositeFunctionType);
      return compositeFunctionType;
    });

    return freeze({
      functionType,
      error
    });
  }
});
