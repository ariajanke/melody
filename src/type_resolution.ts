
import { Helpers, StandardError, StandardErrorFn } from './helpers';
import { ObjectType } from './object_type';
import { Parameter } from './function_type';

const { freeze } = Helpers;

export interface TypeResolution {
  resolve: () => ObjectType | undefined,
  error: StandardErrorFn
}

export const TypeResolution = freeze({
  makeFunctionResolution:
    (mCaller: ObjectType, mName: string, mParameters: Readonly<Parameter[]>): TypeResolution =>
  {
    const { setErrorMessage, error } = StandardError.make();
    return freeze({
      resolve: () => {
        const func = mCaller.lookUp(mName);
        const deg = func.satisfactionDegreeOfArguments(mParameters);
        if (deg === 0) {
          const rets = func.returns();
          if (rets.length > 1) {
            throw Error('Tuple returns not implemented');
          }
          return func.returns()[0];
        }
        return setErrorMessage(`Could not resolve function call for "${mName}"`);
      },
      error
    });
  },
  makeFixedForType: (object: ObjectType): TypeResolution =>
    freeze({
      resolve: () => object,
      error: () => StandardError.make().error()
    })
});
