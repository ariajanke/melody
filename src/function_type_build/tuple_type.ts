import { Helpers } from '../helpers';
import { FunctionLookUpTable, FunctionType, ObjectType } from '../function_type_build';
import { CodeWriter } from '../code_writer';
import { FunctionTypeBase } from './function_type_base';

const { freeze, memoize } = Helpers;

type TupleLookUpTableEntry = {
  object: ObjectType,
  [uid: symbol]: TupleLookUpTableEntry | undefined
};

const makeInstance =
  (name: string, types: Readonly<ObjectType[]>): ObjectType =>
{
  const tallyUp = (sizeFn: (type: ObjectType) => number): number =>
    types.reduce((acc: number, type: ObjectType) => acc + sizeFn(type), 0);
  const inst = freeze({
    name: () => name,
    lookUp(_0: string | symbol): FunctionLookUpTable | undefined {
      return undefined;
    },
    detuplify: () => types,
    uid: memoize(Symbol),
    sizeInBytes: memoize(() =>
      tallyUp((type: ObjectType) => type.sizeInBytes())
    ),
    sizeInStackItems: memoize(() =>
      tallyUp((type: ObjectType) => type.sizeInStackItems())
    ),
    stackCleanUp: memoize((): FunctionType => freeze({
      ...FunctionTypeBase.receivedByNone(),
      parameters: () => inst,
      emit(writer: CodeWriter) {
        types.forEach((type: ObjectType) => {
          type.stackCleanUp().emit(writer);
        });
        return writer;
      }
    }))
  });
  return inst; 
};

const sTable: TupleLookUpTableEntry = { object: makeInstance('Tuple()', []) };

const klass = freeze({
  emptyTuple: memoize((): ObjectType => klass.make([])),
  make(types: Readonly<ObjectType[]>) {
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
});

export const TupleObjectFactory = klass;
