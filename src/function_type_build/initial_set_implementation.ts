import { CodeWriter } from '../code_writer';
import { FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { Helpers, StandardError } from '../helpers';
import { ContextAttributeFactory } from './context_attribute_factory';
// import { FunctionTypeBuildBase } from './function_type_build_base';
import { TupleObjectFactory } from './tuple_type';
import { VariableTracker } from './variable_tracker';

const { freeze, memoize } = Helpers;

export const InitialSetImplementation = freeze({
  make(mVariableNames: Readonly<string[]>,
       mDefinedBy: ObjectType,
       mVariableTracker: VariableTracker): FunctionTypeBuild
  {
    const { error, setErrorMessage } = StandardError.make();
    // const names = mVariableNames; //typeof mName === 'string' ? [mName] : mName;
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
    // typeof mName === 'string' ?
    //   [mDefinedBy] : mDefinedBy.detuplify();
    // if (!parameters) {
    //   return FunctionTypeBuildBase.
    //     makeError('rhs is not a tuple');
    // }
    // if (parameters.length !== names.length && mName.length !== 1) {
    //   return FunctionTypeBuildBase.
    //     makeError(`Given tuple type is ${parameters.length} parameter(s), ` +
    //               `but got ${names.length} name(s)`);
    // }

    const setters = memoize(() => {
      if (!parameters())
        { return undefined; }

      return mVariableNames.map((name: string, index: number) => {
        const { type, accessIndex } = mVariableTracker.
          ensureVariablePresence(name, parameters()![index]);
        return ContextAttributeFactory.buildSetter(accessIndex, type);
      });
    });

    // const setters = names.map((name: string, index: number) => {
    //   const { type, accessIndex } = mVariableTracker.
    //     ensureVariablePresence(name, parameters[index]);
    //   return ContextAttributeFactory.buildSetter(accessIndex, type);
    // });

    const functionType = memoize(() => {
      if (!setters())
        { return; }
      const ftype: FunctionType = freeze({
        parameters: () => mDefinedBy,
        returns: () => TupleObjectFactory.emptyTuple(),
        emit(writer: CodeWriter) {
          for (const setter of setters()!) {
            setter.emit(writer);
          }
          return writer;
        },
        uid: memoize(Symbol)
      });
      return ftype;
    });
    
    // const ftype: FunctionType = freeze({
    //   parameters: () => mDefinedBy,
    //   returns: () => TupleObjectFactory.emptyTuple(),
    //   emit(writer: CodeWriter) {
    //     setters.forEach((setter: FunctionType) =>
    //       setter.emit(writer));
    //     return writer;
    //   },
    //   uid: memoize(Symbol)
    // });
    // return FunctionTypeBuildBase.makeSuccessFromType(ftype);
    return freeze({ functionType, error });
  }
});
