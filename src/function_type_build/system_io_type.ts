import { FunctionLookUpTable, FunctionType, ObjectType } from '../function_type_build';
import { Helpers } from '../helpers';
import { BuiltinTypeBase, ConstantStringType } from './builtin_type_base';
import { PutsFunctionLookUpTable } from './puts_function_look_up_table';
import { FunctionTypeBase } from './function_type_base';
import { IntegerType } from './integer_type';
import { CodeWriter } from '../code_writer';
import { MutableFunctionTable } from './mutable_function_table';

const { freeze, memoize } = Helpers;

function make(): ObjectType {
  function makeAskFunction
    (name: 'askInteger' | 'askString', type: () => ObjectType): FunctionType
  {
    return freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      returns: type,
      simpleEmit(writer: CodeWriter) {
        writer[name]();
      }
    });
  }

  const { fromFunctionType } = MutableFunctionTable;

  const lookUpTable = memoize(():
    { [name: string | symbol]: FunctionLookUpTable | undefined } => 
    freeze({
      'askInteger': fromFunctionType(makeAskFunction('askInteger', IntegerType.instance)),
      'askString': fromFunctionType(makeAskFunction('askString', ConstantStringType.instance)),
      'puts': PutsFunctionLookUpTable.instance()
    }));

  const inst = freeze({
    ...BuiltinTypeBase.makeNewWithDefaults(),
    sizeInBytes: () => 0,
    sizeInStackItems: () => 0,
    name: () => 'SystemIO',
    lookUp(name: string | symbol): FunctionLookUpTable | undefined
      { return lookUpTable()[name]; },
  });

  return inst;
}

const selfGetter = memoize((): FunctionType => freeze({
  ...FunctionTypeBase.makeNewEmitlessEmpty(),
  returns: SystemIoType.instance,
  simpleEmit(_0: CodeWriter) {}
}));

export const SystemIoType = freeze({ instance: memoize(make), selfGetter });
