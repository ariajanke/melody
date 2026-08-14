import { Helpers } from '../helpers';
import { FunctionLookUpTable, ObjectType } from '../function_type_build';

const { freeze, memoize } = Helpers;

type TupleLookUpTableEntry = {
  object: ObjectType;
  [uid: symbol]: TupleLookUpTableEntry | undefined;
};

const emptyLookUp =
  (_0: string | symbol): FunctionLookUpTable | undefined => undefined;

const makeInstance =
  (name: string, types: Readonly<ObjectType[]>): ObjectType =>
{
  const tallyUp = (sizeFn: (type: ObjectType) => number): number =>
    types.reduce((acc: number, type: ObjectType) => acc + sizeFn(type), 0);
  return freeze({
    name: () => name,
    lookUp: emptyLookUp,
    detuplify: (): Readonly<ObjectType[]> => types,
    uid: memoize(Symbol),
    sizeInBytes: memoize(() =>
      tallyUp((type: ObjectType) => type.sizeInBytes())),
    sizeInStackItems: memoize(() =>
      tallyUp((type: ObjectType) => type.sizeInStackItems()))
  });
};

const sTable: TupleLookUpTableEntry = { object: makeInstance('Tuple()', []) };

const emptyTuple = memoize((): ObjectType => instanceFor([]));

function instanceFor(types: Readonly<ObjectType[]>) {
  // NOTE by definition, a tuple of a single type is that type
  if (types.length === 1) {
    return types[0];
  }
  
  let seekingOn = sTable;
  let tupleName = 'Tuple(';
  types.forEach((type: ObjectType, idx: number) => {
    tupleName += type.name();
    seekingOn = seekingOn[type.uid()] ??=
      { object: makeInstance(`${tupleName})`, types.slice(0, idx + 1)) };
    tupleName += ', ';
  });
  return seekingOn.object;
}

export const TupleObjectType = freeze({ emptyTuple, instanceFor });
