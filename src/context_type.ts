import { AstNode } from './ast_node';
import { AstStringLiteralNode } from './ast_string_literal_node';
import { ContextVariable } from './context_variable';
import { PutsFunctionLookUpTable } from './puts_function_look_up_table';
import { CallHandlingStrategies, IncompleteFunctionType } from './function_type';
import { Helpers } from './helpers';
import { IntegerType } from './integer_type';
import { ObjectType } from './object_type';
import { PersistentStack } from './persistent_stack';
import { StringType } from './string_type';

const { memoize, freeze } = Helpers;
const { noReceiver } = CallHandlingStrategies;

export type StringPool = {
  lookUp(str: string): number | undefined
};
export const StringPool = freeze({  
  makeDefault: memoize((): StringPool => {
    const node = AstStringLiteralNode.make('bees');
    return StringPool.make(node);
  }),   
  make(rootNode: AstNode): StringPool {
    const reversePoolLookUp = memoize(() => {
      const revmap = rootNode.
        visit( StringType.stringPoolVisitor() ).
        map((val: string, idx: number) => ({ [val]: idx }));
      return Object.assign({}, ...revmap) as { [name: string]: number | undefined };
    });
    return freeze({
      lookUp: (str: string) =>
        reversePoolLookUp()[str]
    });
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
  getIntegerType: IntegerType.instance,
  getStringPool: StringPool.makeDefault
}));

function construct(injections = defaultInjections()) {
  const {
    putsFunction,
    askStringFunction,
    askIntegerFunction,
    getIntegerType,
    getStringType,
    getStringPool
  } = injections;
  const stringType = getStringType();
  const integerType = getIntegerType();
  const stringPool = getStringPool();
  const askString = IncompleteFunctionType.
    make().
    setCallStrategy(noReceiver).
    setName('askString').
    setParameters([]).
    setReturns([ stringType ]).
    setBuiltin((stack: PersistentStack<ContextVariable>) => {
      stringPool.lookUp(askStringFunction());
      stack.push().set(askStringFunction());
    }).
    finish();

  const askInteger = IncompleteFunctionType.
    make().
    setCallStrategy(noReceiver).
    setName('askInteger').
    setParameters([]).
    setReturns([ integerType ]).
    setBuiltin((stack: PersistentStack<ContextVariable>) => {
      stack.push().set(askIntegerFunction());
    }).
    finish();

  const puts = PutsFunctionLookUpTable.make(getStringPool, putsFunction);

  return ObjectType.
    make(class_.typeName()).
    setLookUp({ askString, askInteger }).
    setLookUpTable({ puts });
}

const class_ = freeze({
  make: construct,
  defaultInjections,
  typeName: () => 'Context'
});

export const ContextType = class_;
