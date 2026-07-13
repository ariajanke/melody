import { CodeWriter } from '../code_writer';
import { FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { Helpers, StandardError } from '../helpers';
import { ContextAttributeFactory } from './context_attribute_factory';
import { FunctionTypeBase } from './function_type_base';
import { VariableTracker } from './variable_tracker';

const { freeze, memoize } = Helpers;

export const InitialSetImplementation = freeze({
  make(mVariableNames: Readonly<string[]>,
       mDefinedBy: ObjectType,
       mVariableTracker: VariableTracker): FunctionTypeBuild
  {
    const { error, setErrorMessage } = StandardError.make();

    const parameters = memoize(() => {
      if (mVariableNames.length === 1) {
        return [mDefinedBy];
      }
      const detupled = mDefinedBy.detuplify();
      if (!detupled) {
        return setErrorMessage('rhs is not a tuple');
      }
      if (detupled.length !== mVariableNames.length) {
        return setErrorMessage(`Given tuple type is ${detupled.length} parameter(s), ` +
                               `but got ${mVariableNames.length} name(s)`);
      }
      return detupled;
    });

    const setters = memoize(() => {
      if (!parameters())
        { return undefined; }

      return mVariableNames.map((name: string, index: number) => {
        const { type, accessIndex } = mVariableTracker.
          ensureVariablePresence(name, parameters()![index]);
        return ContextAttributeFactory.buildSetter(accessIndex, type);
      });
    });

    const functionType = memoize(() => {
      if (!setters())
        { return; }
      const ftype: FunctionType = freeze({
        ...FunctionTypeBase.receivedByContext(),
        parameters: () => mDefinedBy,
        emit(writer: CodeWriter) {
          for (const setter of setters()!) {
            setter.emit(writer);
          }
          return writer;
        }
      });
      return ftype;
    });
    
    return freeze({ functionType, error });
  }
});
