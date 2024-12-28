import { 
  CallHandlingStrategies,
  CallingContext,
  IncompleteFunctionType
} from './function_type';
import { Helpers } from './helpers';
import { IntegerType } from './integer_type';
import { StringType } from './string_type';
import { ObjectType, WritableObjectType } from './object_type';
import { PutsPrinterType } from './puts_function_look_up_table';
import { CodeWriter } from './code_writer';

const { memoize, freeze } = Helpers;
const { noReceiver } = CallHandlingStrategies;

const defaultInjections = memoize(() => freeze({
  getStringType: StringType.instance,
  getIntegerType: IntegerType.instance
}));

export type ContextTypeInjections = ReturnType<typeof defaultInjections>;

function makeWritable(injections = defaultInjections()) {
  const { getIntegerType, getStringType, } = injections;
  const stringType = getStringType();
  const integerType = getIntegerType();
  const { emptyTupleInstance } = ObjectType;
  const askString = IncompleteFunctionType.
    make().
    setCallStrategy(noReceiver).
    setName('askString').
    setParameters(emptyTupleInstance()).
    setReturns( stringType ).
    setBuiltin((_0: CallingContext, writer: CodeWriter) => {
      // just ignore it, problem solved n.-
      writer.askString();
    }).
    finish();

  const askInteger = IncompleteFunctionType.
    make().
    setCallStrategy(noReceiver).
    setName('askInteger').
    setParameters(emptyTupleInstance()).
    setReturns( integerType ).
    setBuiltin((_0: CallingContext, writer: CodeWriter) => {
      writer.askInteger();
    }).
    finish();

  const { contextMethodName } = class_;
  const getSelf = IncompleteFunctionType.
    make().
    setCallStrategy(noReceiver).
    setName(contextMethodName()).
    setParameters(emptyTupleInstance()).
    setReturns(emptyTupleInstance()).
    setBuiltin((_0: CallingContext, _1: CodeWriter) => {}).
    finish();

  const puts = PutsPrinterType.make();

  const writable = WritableObjectType.
    make().
    setName(class_.typeName()).
    pushFunctionTypes({
      askString,
      askInteger,
      [contextMethodName()]: getSelf
    });
  puts.mergeInto(writable);
  return writable;
}

function construct(injections = defaultInjections()) {
  return makeWritable(injections).objectType();
}

const class_ = freeze({
  make: construct,
  makeWritable,
  defaultInjections,
  typeName: () => 'Context',
  contextMethodName: () => '<context>',
});

export const ContextType = class_;
