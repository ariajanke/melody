import { CodeWriter } from '../code_writer';
import { FunctionLookUpTable, ObjectType, FunctionType } from '../function_type_build';
import { Helpers } from '../helpers';
import { BuiltinTypeBase } from './builtin_type_base';
import { FunctionTypeBase } from './function_type_base';
import { MutableFunctionTable } from './mutable_function_table';

const { freeze, memoize } = Helpers;

function make(): ObjectType {
  type CodeWriterFnName = 'addIntegers' | 'multiplyIntegers' | 'subtractIntegers';

  function mkOperation(writerFn: CodeWriterFnName): FunctionLookUpTable {
    const ftype = freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      receiver: () => inst,
      parameters: () => inst,
      returns: () => inst,
      emit(receiverFtype: FunctionType,
           parameterFtype: FunctionType,
           writer: CodeWriter): void
      {
        receiverFtype.simpleEmit(writer);
        parameterFtype.simpleEmit(writer);
        writer[writerFn]();
      },
      simpleEmit(writer: CodeWriter): CodeWriter {
        return writer[writerFn]();
      }
    });

    return MutableFunctionTable.fromFunctionType(ftype);
  }

  const lookUpTable = memoize(():
    { [name: string | symbol]: FunctionLookUpTable | undefined } => 
    freeze({
    '+': mkOperation('addIntegers'),
    '*': mkOperation('multiplyIntegers'),
    '-': mkOperation('subtractIntegers')
  }));

  const inst = freeze({
    ...BuiltinTypeBase.makeNewWithDefaults(),
    name: () => 'Integer',
    lookUp(name: string | symbol): FunctionLookUpTable | undefined
      { return lookUpTable()[name]; },
  });

  return inst;
}

export const IntegerType = freeze({ instance: memoize(make) });
