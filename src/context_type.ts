import { 
  CallHandlingStrategies,
  CallingContext,
  CodeWriter,
  IncompleteFunctionType
} from './function_type';
import { Helpers } from './helpers';
import { IntegerType } from './integer_type';
import { StringType } from './string_type';
import { type AstNodeVisitor } from './ast_node_visitor';
import { AstIdentifierNode } from './ast_identifier_node';
import { type ObjectLookUpTable } from './object_look_up_table';
import { ObjectType, WritableObjectType } from './object_type';
import { PutsPrinterType } from './puts_function_look_up_table';

const { memoize, freeze } = Helpers;
const { noReceiver } = CallHandlingStrategies;


const defaultInjections = memoize(() => freeze({
  getStringType: StringType.instance,
  getIntegerType: IntegerType.instance
}));

export type ContextTypeInjections = ReturnType<typeof defaultInjections>;

function contextReceiverDummyNode(): AstIdentifierNode {
  const inst = freeze({
    value: () => {
      throw new Error('Special context type cannot have a value');
    },
    visit: <AccumulationType>(visitor: AstNodeVisitor<AccumulationType>): AccumulationType =>
      visitor.visitIdentifier(inst),
    type: AstIdentifierNode.type,
    executionType: (objTable: ObjectLookUpTable) => 
      objTable.lookUpByName(ContextType.typeName()),
    asString: () => '<context>',
    contextMethodName: () => '<context>' // call by "$<context>"
  });
  return inst;
}

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

  const { contextMethodName } = class_.asReceiverPlaceholderNode();
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
  asReceiverPlaceholderNode: memoize(contextReceiverDummyNode)
});

export const ContextType = class_;
