import { FunctionLookUpTable, FunctionType, ObjectType } from '../function_type_build';
import { Helpers, raise } from '../helpers';
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

  const assignableFtype = memoize((): FunctionType => freeze({
    ...FunctionTypeBase.makeNewEmitlessEmpty(),
    parameters: IntegerType.instance,
    returns: IntegerType.instance,
    emit(receiverFtype: FunctionType,
         parameterFtype: FunctionType,
         writer: CodeWriter): void
    {
      if (receiverFtype.returns().uid() !== inst.uid())
        { raise('receiver assumptions'); }

      if (parameterFtype.returns().uid() !== IntegerType.instance().uid())
        { raise('parameter assumptions'); }

      writer.pushLiteralString('\n');
      parameterFtype.simpleEmit(writer);
      writer.pushLiteralString('SystemIO assignable set with ');

      writer.printString().printInteger().printString();
      parameterFtype.simpleEmit(writer);
    }
  }));

  const { fromFunctionType } = MutableFunctionTable;

  const lookUpTable = memoize(():
    { [name: string | symbol]: FunctionLookUpTable | undefined } => 
    freeze({
      '.self': fromFunctionType(selfGetter()),
      'assignable:=': fromFunctionType(assignableFtype()),
      'askInteger': fromFunctionType(makeAskFunction('askInteger', IntegerType.instance)),
      'askString': fromFunctionType(makeAskFunction('askString', ConstantStringType.instance)),
      'puts': PutsFunctionLookUpTable.instance()
    }));

  const inst = freeze({
    ...BuiltinTypeBase.makeNewWithDefaults(),
    uid: () => PutsFunctionLookUpTable.kSystemIOUid,
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
