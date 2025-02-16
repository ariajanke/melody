import { BuiltInFunction, CallingContext } from '../function_type';
import { ObjectType } from '../object_type';
import { Helpers } from '../helpers';
import { FunctionAbility } from '../function_ability';

const { freeze } = Helpers;

type CallingContextFactory =
  (callingContext: CallingContext) => CallingContext;

const reservedAnonymousName = '<anonymous>';

export type FunctionInitialization = {
  parameters        : ObjectType,
  returns           : ObjectType,
  builtin           : BuiltInFunction | undefined,
  name              : string,
  contextStrategy   : CallingContextFactory,
  ability           : typeof FunctionAbility.isKnownableLater
};

export const FunctionInitialization = freeze({
  reservedAnonymousName,
  makeDefault: () => ({
    parameters        : ObjectType.emptyTupleInstance(),
    returns           : ObjectType.emptyTupleInstance(),
    builtin           : undefined,
    name              : reservedAnonymousName,
    contextStrategy   : CallingContext.toInherit,
    ability           : FunctionAbility.isKnownableLater
  })
});
