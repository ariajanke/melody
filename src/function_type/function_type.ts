import { CodeWriter } from '../code_writer';
import { FunctionAbility } from '../function_ability';
import { BuiltInFunction, CallingContext } from '../function_type';
import { Helpers } from '../helpers';
import { ObjectType } from '../object_type';
import { WritableObjectType } from '../writable_object_type';
import { FunctionInitialization } from './function_initialization';
import { IncompleteFunctionType } from './incomplete_function_type';

const { freeze, memoize } = Helpers;

export interface FunctionType {
  parameters: () => ObjectType,
  builtIn(): BuiltInFunction,
  name: () => string,
  returns: () => ObjectType,
  uid: () => symbol,
  callingContextForParameters: (callingContext: CallingContext) => CallingContext,
  ability(): FunctionAbility
};

function construct(m: FunctionInitialization): FunctionType {
  const parameters: ObjectType = m.parameters;
  const returns   : ObjectType = m.returns;
  const {
    builtin,
    name,
    ability
  } = m;
  if (!builtin) {
    throw new Error('implementation was not set');
  }

  const inst = freeze({
    callingContextForParameters: m.contextStrategy,
    parameters: () => parameters,
    returns: () => returns,
    uid: memoize(Symbol),
    name: () => name,
    builtIn: () => builtin,
    ability
  });
  return inst;
}

function asAnObjectType() {
  const mutable_function_type = WritableObjectType.
    make().
    setName('Function').
    setToIntegerSize();
  const function_ = mutable_function_type.objectType();
  
  mutable_function_type.pushFunctionTypeByName(':=', IncompleteFunctionType.
    make().
    setName(':=').
    setParameters(function_).
    setReturns  ( function_ ).
    setBuiltin((_0: CallingContext, _1: CodeWriter) => {}).
    finish());

  return function_;
}

export const FunctionType = freeze({
  make: construct,
  asAnObjectType: memoize(asAnObjectType)
});
