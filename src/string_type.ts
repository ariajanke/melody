import {
  CallHandlingStrategies,
  CallingContext,
  IncompleteFunctionType
} from './function_type';
import { Helpers } from './helpers';
import { WritableObjectType } from './writable_object_type';
import { type CodeWriter } from './code_writer';

const { freeze, memoize } = Helpers;

const class_ = freeze({
  
  instance: memoize(() => {
    const mutable_type = WritableObjectType.make().setName('String');
    const type = mutable_type.objectType();
    mutable_type.pushFunctionTypeByName(':=', IncompleteFunctionType.
      make().
      setCallStrategy( CallHandlingStrategies.noReceiver ).
      setName(':=').
      setParameters(type).
      setReturns   (type).
      setBuiltin((_0: CallingContext, _1: CodeWriter) => {}).
      finish());
    return freeze({
      ...type,
      sizeInBytes: () => 4
    });
  })
});

export const StringType = class_;