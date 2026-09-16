import { ObjectType } from '../function_type_build';
import { Helpers, raise, StandardErrorMessage } from '../helpers';

const { freeze, memoize } = Helpers;

// my Melody methods are:
// type: The actual ObjectType

interface TypeRepresentationInstance {
  resultantType(): ObjectType | undefined;
  error(): StandardErrorMessage;
  lookUp(callName: string, parameterType: ObjectType)
    : TypeRepresentationInstance;
};

type MapTypeToRepresentation =
  { [objectTypeUid: symbol]: TypeRepresentationInstance | undefined };

const sTypeToRepMap: MapTypeToRepresentation = {};

function makeErrorRepresentation(message: string): TypeRepresentationInstance {
  const resultantType = () => undefined;

  const lookUp =
    (_0: string, _1: ObjectType): TypeRepresentationInstance =>
  { return inst; };

  const inst = freeze({
    resultantType,
    error: memoize(() => freeze({ message })),
    lookUp
  });
  return inst;
}

function registerType(type: ObjectType): TypeRepresentationInstance {
  if (sTypeToRepMap[type.uid()])
    { raise('cannot re-register type'); }

  const rep = makeRepresentation(type);
  sTypeToRepMap[type.uid()] = rep;
  return rep;
}

function makeRepresentation
  (mResultantType: ObjectType): TypeRepresentationInstance
{
  const lookUp =
    (callName: string, parameterType: ObjectType): TypeRepresentationInstance =>
  {
    const rtype = mResultantType.
      lookUp(callName)?.
      byParameters(parameterType)?.
      returns();
    if (!rtype) {
      const tname = mResultantType.name();
      return makeErrorRepresentation(`${callName} is not defined for ${tname} type`);
    }

    return registerType(rtype);
  };

  const inst: TypeRepresentationInstance = freeze({
    resultantType: () => mResultantType,
    error: () => raise(`Is "${mResultantType.name()}" not an error!`),
    lookUp
  });

  return inst;
}

function make() {

}