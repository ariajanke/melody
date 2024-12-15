import { AstNode } from './ast_node';
import { AstStringLiteralNode } from './ast_string_literal_node';
import { PutsFunctionLookUpTable } from './puts_function_look_up_table';
import { CallHandlingStrategies, IncompleteFunctionType } from './function_type';
import { Helpers } from './helpers';
import { IntegerType } from './integer_type';
import { ObjectType } from './object_type';
import { PersistentStack } from './persistent_stack';
import { StringType } from './string_type';
import { type AstNodeVisitor } from './ast_node_visitor';
import { AstIdentifierNode } from './ast_identifier_node';
import { type ObjectLookUpTable } from './object_look_up_table';

const { memoize, freeze } = Helpers;
const { noReceiver } = CallHandlingStrategies;

export type StringPool = {
  lookUp(str: string): number | undefined
  reverseLookUp(n: number): string | undefined
  askString(): number
};
export const StringPool = freeze({  
  makeDefault: memoize((): StringPool => {
    const node = AstStringLiteralNode.make('bees');
    return StringPool.make(node);
  }),
  makeForStrings(getStrings: () => string[]) {
    const stringsArray = memoize(getStrings);
    const reversePoolLookUp = memoize(() => {
      const revmap = stringsArray().
        map((val: string, idx: number) => ({ [val]: idx }));
      return Object.assign({}, ...revmap) as { [name: string]: number | undefined };
    });
    let mAskRot = 0;
    return freeze({
      lookUp: (str: string) =>
        reversePoolLookUp()[str],
      reverseLookUp: (n: number) =>
        stringsArray()[n],
      askString() {
        const rv = mAskRot;
        mAskRot = (mAskRot + 1) % stringsArray().length;
        return rv;
      }
    });
  },
  make(rootNode: AstNode): StringPool {
    return StringPool.makeForStrings(() => rootNode.
      visit( StringType.stringPoolVisitor() ));
  }
});

const defaultInjections = memoize(() => freeze({
  putsFunction(_0: string) {},
  askStringFunction: (): string => 'bees',
  askIntegerFunction: (() => {
    let i = 0;
    return () => i++;
  }) (),
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

function construct(mStringPool: StringPool, injections = defaultInjections()) {
  const {
    putsFunction,
    askStringFunction,
    askIntegerFunction,
    getIntegerType,
    getStringType,
  } = injections;
  const stringType = getStringType();
  const integerType = getIntegerType();
  const askString = IncompleteFunctionType.
    make().
    setCallStrategy(noReceiver).
    setName('askString').
    setParameters([]).
    setReturns([ stringType ]).
    setBuiltin((stack: PersistentStack<number>) => {
      stack.push( mStringPool.lookUp(askStringFunction()) );
    }).
    finish();

  const askInteger = IncompleteFunctionType.
    make().
    setCallStrategy(noReceiver).
    setName('askInteger').
    setParameters([]).
    setReturns([ integerType ]).
    setBuiltin((stack: PersistentStack<number>) => {
      stack.push(askIntegerFunction());
    }).
    finish();

  const { contextMethodName } = class_.asReceiverPlaceholderNode();
  const getSelf = IncompleteFunctionType.
    make().
    setCallStrategy(noReceiver).
    setName(contextMethodName()).
    setParameters([]).
    setReturns([]).
    setBuiltin((_0: PersistentStack<number>) => {}).
    finish();

  const puts = PutsFunctionLookUpTable.make(mStringPool, putsFunction);

  return ObjectType.
    make(class_.typeName()).
    setLookUp({
      askString,
      askInteger,
      [contextMethodName()]: getSelf
    }).
    setLookUpTable({ puts });
}

const class_ = freeze({
  make: construct,
  defaultInjections,
  typeName: () => 'Context',
  asReceiverPlaceholderNode: memoize(contextReceiverDummyNode)
});

export const ContextType = class_;
