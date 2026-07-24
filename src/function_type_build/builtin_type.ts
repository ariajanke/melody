import { CodeWriter } from '../code_writer';
import {
  FunctionLookUpTable,
  ObjectType 
} from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { MemoryArray } from '../memory_array';
import { FunctionTypeBase } from './function_type_base';
import { MutableFunctionTable } from './mutable_function_table';

const { freeze, memoize } = Helpers;

const typeBaseDefaults = memoize((): ObjectType => freeze({
  name: () => { raise('write me'); },
  lookUp(_0: string | symbol): FunctionLookUpTable | undefined
    { return undefined; },
  detuplify() { return undefined; },
  uid: () => { raise('write me'); },
  sizeInBytes: () => MemoryArray.kWordSizeInBytes,
  sizeInStackItems: () => 1,
}));

export const BuiltinTypeBase = freeze({
  defaultsWith: (): ObjectType => freeze({
    ...typeBaseDefaults(),
    uid: memoize(Symbol)
  })
});

export const ConstantStringType = freeze({
  instance: memoize((): ObjectType =>
    freeze({
      ...BuiltinTypeBase.defaultsWith(),
      name: () => 'ConstantString',
    }))
});

export const IntegerType = freeze({
  instance: memoize((): ObjectType => {
    type CodeWriterFnName = 'addIntegers' | 'multiplyIntegers' | 'subtractIntegers';
    function mkOperation(writerFn: CodeWriterFnName): () => FunctionLookUpTable {
      return () => {
        const ftype = freeze({
          ...FunctionTypeBase.makeNewEmitlessEmpty(),
          receiver: () => inst,
          parameters: () => inst,
          returns: () => inst,
          simpleEmit(writer: CodeWriter): CodeWriter {
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
      ...BuiltinTypeBase.defaultsWith(),
      name: () => 'Integer',
      lookUp(name: string | symbol): FunctionLookUpTable | undefined
        { return lookUpTable()[name]; },
    });
    return inst;
  })
});
