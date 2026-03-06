import { CodeWriter } from '../code_writer';
import {
  FunctionLookUpTable,
  FunctionType,
  ObjectType 
} from '../function_type_build';
import { Helpers } from '../helpers';
import { MemoryArray } from '../memory_array';
import { FunctionTypeBase } from './function_type_base';
import { MutableFunctionTable } from './mutable_function_table';

const { freeze, memoize } = Helpers;

const typeBaseDefaults = memoize((): ObjectType => freeze({
  name: () => { throw new Error('write me'); },
  lookUp(_0: string | symbol): FunctionLookUpTable | undefined
    { return undefined; },
  detuplify() { return undefined; },
  uid: () => { throw new Error('write me'); },
  sizeInBytes: () => MemoryArray.kWordSizeInBytes,
  sizeInStackItems: () => 1,
  stackCleanUp() { throw new Error('write me'); }
}));

const cleanUpEmitFor = (() => {
  const noItems = (writer: CodeWriter) => writer;
  const oneItem = (writer: CodeWriter) => writer.drop();
  const makeManyItems = (n: number) => (writer: CodeWriter) => writer.pushRepresentation(n);
  const emitCache: { [n: number]: (writer: CodeWriter) => CodeWriter } = {
    0: noItems,
    1: oneItem
  };

  return (nItems: number): (writer: CodeWriter) => CodeWriter => {
    return emitCache[nItems] ??= makeManyItems(nItems);
  };
})();

export const BuiltinTypeBase = freeze({
  defaultsWith: (getInst: () => ObjectType): ObjectType => freeze({
    ...typeBaseDefaults(),
    uid: memoize(Symbol),
    stackCleanUp: memoize((): FunctionType => {
      const emit = cleanUpEmitFor(getInst().sizeInStackItems());
      return freeze({
        ...FunctionTypeBase.receivedByNone(),
        parameters: getInst,
        emit,
      });
    })
  })
});

export const ConstantStringType = freeze({
  instance: memoize((): ObjectType => {
    const inst = freeze({
      ...BuiltinTypeBase.defaultsWith((): ObjectType => inst),
      name: () => 'ConstantString',
    });
    return inst;
  })
});

export const IntegerType = freeze({
  instance: memoize((): ObjectType => {
    type CodeWriterFnName = 'addIntegers' | 'multiplyIntegers' | 'subtractIntegers';
    function mkOperation(writerFn: CodeWriterFnName): () => FunctionLookUpTable {
      return () => {
        const ftype = freeze({
          ...FunctionTypeBase.receivedByLexical(),
          parameters: () => inst,
          returns: () => inst,
          emit(writer: CodeWriter): CodeWriter {
            return writer[writerFn]();
          }
        });
        return MutableFunctionTable.make().setDefinition(inst, ftype);
      };
    }
    const getPlus = mkOperation('addIntegers');
    const getTimes = mkOperation('multiplyIntegers');
    const getMinus = mkOperation('subtractIntegers');
    const lookUpTable = memoize(():
      { [name: string | symbol]: FunctionLookUpTable | undefined } => 
      freeze({
      '+': getPlus(),
      '*': getTimes(),
      '-': getMinus()
    }));

    const inst = freeze({
      ...BuiltinTypeBase.defaultsWith((): ObjectType => inst),
      name: () => 'Integer',
      lookUp(name: string | symbol): FunctionLookUpTable | undefined
        { return lookUpTable()[name]; },
    });
    return inst;
  })
});
