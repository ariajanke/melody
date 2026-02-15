import { CodeWriter } from './code_writer';
import { FunctionLookUpTable, FunctionType, FunctionTypeBuild, ObjectType } from './function_type_build';
import { Helpers } from './helpers';
import { MemoryArray } from './memory_array';
import { Token } from './token';

export interface FunctionTypeRegistry {
  indexEmissionOf(ftype: FunctionType): FunctionType;
  functionObjectType(): ObjectType;
  forEach(fn: (implementation: FunctionType,
               indexEmission: FunctionType) => void): void;
};

interface RegistryEntry {
  implementation: FunctionType;
  indexEmission: FunctionType;
};

const { freeze, memoize } = Helpers;

const kSignatureIndex = 0;

function make() {
  const mRegistry:
    { [implementationUid: symbol]: RegistryEntry | undefined } = {};
  const mReverseRegistry: { [indexEmissionUid: symbol]: FunctionType | undefined } = {};
  let mRegistryLength = 0;

  const { emptyTupleType } = FunctionTypeBuild;
  const callName = Token.kCallToken.content;
  const callFunction = memoize((): FunctionType => freeze({
    parameters: () => emptyTupleType(),
    returns: () => emptyTupleType(),
    emit(writer: CodeWriter) {
      return writer.indirectCall(kSignatureIndex);
    },
    uid: memoize(Symbol)
  }));
  const functionLookUpTable = memoize(() => freeze({
    [callName()]: freeze({
      byParameters(params: ObjectType): FunctionType | undefined {
        if (params.uid() !== emptyTupleType().uid())
          { return undefined; }
        return callFunction();
      }
    }),
    // make TS happy lol
    [Symbol()]: undefined
  }));

  const functionObjectType = memoize((): ObjectType => {
    const objectType = freeze({
      name: () => 'Function()()',
      lookUp(name: string | symbol): FunctionLookUpTable | undefined
        { return functionLookUpTable()[name]; },
      detuplify() { return undefined; },
      uid: memoize(Symbol),
      sizeInBytes: () => MemoryArray.kWordSizeInBytes,
      sizeInStackItems: () => 1,
      stackCleanUp: memoize((): FunctionType => freeze({
        parameters: () => objectType,
        returns: () => emptyTupleType(),
        emit(writer: CodeWriter) {
          return writer.drop();
        },
        uid: memoize(Symbol)
      }))
    });
    return objectType;
  });

  function newIndexEmission(): FunctionType {
    const idx = mRegistryLength++;
    return freeze({
      parameters: () => emptyTupleType(),
      returns: () => functionObjectType(),
      emit(writer: CodeWriter) {
        return writer.pushRepresentation(idx);
      },
      uid: memoize(Symbol)
    });
  }

  return freeze({
    indexEmissionOf(implementation: FunctionType): FunctionType {
      const uid = implementation.uid();
      const found = mRegistry[uid];
      if (found)
        { return found.indexEmission; }

      const indexEmission = newIndexEmission();

      mReverseRegistry[indexEmission.uid()] = implementation;
      mRegistry[uid] =
        {
          implementation,
          indexEmission
        };
      return indexEmission;
    },
    reverseLookUp(indexEmission: FunctionType): FunctionType | undefined {
      return mReverseRegistry[indexEmission.uid()];
    },
    forEach(fn: (implementation: FunctionType, indexEmission: FunctionType) => void): void {
      Object.getOwnPropertySymbols(mRegistry).forEach((uid) => {
        const entry = mRegistry[uid];
        fn(entry!.implementation, entry!.indexEmission);
      });
    },
    functionObjectType
  });
}

export const FunctionTypeRegistry = freeze({ make, kSignatureIndex });
