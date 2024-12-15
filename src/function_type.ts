import { Helpers } from './helpers';
import { type PersistentStack } from './persistent_stack';
import { type AstFunctionDefinitionNode } from './ast_function_definition_node';
import { MemoryArray } from './memory_array';
import { ObjectType } from './object_type';

const { freeze, memoize } = Helpers;

export interface CallHandlingStrategies {
  chooseReceiver: (fn: () => void) => CallHandlingStrategies
};

const uninitializedCallStrategies = memoize((): CallHandlingStrategies => freeze({
  chooseReceiver(_0: () => void) { throw new Error('call handling not set'); },
}));

export const CallHandlingStrategies = (() => {
  return freeze({
    withReceiver: memoize((): CallHandlingStrategies => {
      const inst = freeze({
        chooseReceiver(fn: () => void) {
          fn();
          return inst;
        }
      });
      return inst;
    }),
    noReceiver: memoize((): CallHandlingStrategies => {
      const inst = freeze({
        chooseReceiver(_0: () => void) { return inst; },
      });
      return inst;
    })
  });
})();

export type BuiltInFunction =
  (stack: PersistentStack<number>,
   memory: MemoryArray) => void;

export interface FunctionType {
  parameters: () => Readonly<ObjectType[]>,
  onBuiltIn: (fn: (bif: BuiltInFunction) => void) => FunctionType,
  onNodeImplementation: (fn: (node: AstFunctionDefinitionNode) => void) => FunctionType,
  // how do I prevent this type from becoming an implementation "dumping ground"?
  // visitWasmCodeWriter
  name: () => string,
  returns: () => Readonly<ObjectType[]>,
  uid: () => symbol,
  // have to know for instance, how to handle the lhs identifier
  // can't let this get tangled up with the intepreter (dependancy wise)
  // have the intepreter/compiler/whatever provide a table of strategies
  // let this function type choose which strategy is appropriate
  withCallStrategy: () => CallHandlingStrategies,
  composeWith(compositor: FunctionCompositor): FunctionCompositor
};

export interface IncompleteFunctionType {
  setName: (name: string) => IncompleteFunctionType,
  setParameters: (args: Readonly<ObjectType[]>) => IncompleteFunctionType,
  setReturns: (args: Readonly<ObjectType[]>) => IncompleteFunctionType,
  setBuiltin: (fn: BuiltInFunction) => IncompleteFunctionType,
  setAstNode: (node: AstFunctionDefinitionNode) => IncompleteFunctionType,
  setCallStrategy: (fn: () => CallHandlingStrategies) => IncompleteFunctionType,
  finish: () => FunctionType
};

type FunctionInitialization = {
  parameters  : ObjectType[],
  returns     : ObjectType[],
  builtin     : BuiltInFunction | undefined,
  nodeImplementation: AstFunctionDefinitionNode | undefined,
  name        : string,
  callStrategy: CallHandlingStrategies
};

export interface FunctionCompositor {
  pushBuiltin: (fn: BuiltInFunction, returnTypes: Readonly<ObjectType[]>) => FunctionCompositor,
  haveReturnNothing: () => FunctionCompositor,
  finish(): FunctionType
};

export const FunctionCompositor = freeze({
  make() {
    const mBuiltins: BuiltInFunction[] = [];
    const mTypes: ObjectType[][] = [];
    const mDefaultReturnTypes = () =>
      mTypes.map((types: ObjectType[]) => ObjectType.makeForTuple(types));
    let mOverrideReturn: () => Readonly<ObjectType[]> | undefined = () => undefined;
    const inst = freeze({
      pushBuiltin(fn: BuiltInFunction, _1: Readonly<ObjectType[]>): FunctionCompositor {
        mBuiltins.push(fn);
        return inst;
      },
      haveReturnNothing() {
        mOverrideReturn = (): Readonly<ObjectType[]> => [];
        return inst;
      },
      finish: memoize((): FunctionType =>
        IncompleteFunctionType.
          make().
          setCallStrategy(CallHandlingStrategies.noReceiver).
          setBuiltin((stack: PersistentStack<number>, memory: MemoryArray) => {
            mBuiltins.forEach((fn: BuiltInFunction) => fn(stack, memory));
          }).
          setParameters([]).
          setReturns(mOverrideReturn() ?? mDefaultReturnTypes()).
          finish())
    });
    return inst;
  }
});

export const IncompleteFunctionType = (() => {
  const reservedAnonymousName = '<anonymous>';
  function make(): IncompleteFunctionType {
    const m: FunctionInitialization = {
      parameters  : [],
      returns     : [],
      builtin     : undefined,
      nodeImplementation: undefined,
      name        : reservedAnonymousName,
      callStrategy: uninitializedCallStrategies()
    };

    const inst = freeze({
      setName(name: string): IncompleteFunctionType {
        if (name === reservedAnonymousName) {
          throw Error(`Cannot name function "${name}"`);
        }
        m.name = name;
        return inst;
      },
      setParameters(args: Readonly<ObjectType[]>): IncompleteFunctionType {
        m.parameters.length = 0;
        m.parameters.push(...args);
        return inst;
      },
      setReturns(rets: Readonly<ObjectType[]>): IncompleteFunctionType {
        m.returns.length = 0;
        m.returns.push(...rets);
        return inst;
      },
      setAstNode(node: AstFunctionDefinitionNode): IncompleteFunctionType {
        m.builtin = undefined;
        m.nodeImplementation = node;
        return inst;
      },
      setCallStrategy(fn: () => CallHandlingStrategies): IncompleteFunctionType {
        m.callStrategy = fn();
        return inst;
      },
      finish(): FunctionType {
        if (m.nodeImplementation === undefined &&
            m.builtin            === undefined)
        {
          throw new Error('Cannot complete function without an implementation');
        }
        // throws if "uninitialized"
        m.callStrategy.chooseReceiver(() => {});
        return FunctionType.make(m);
      },
      setBuiltin(fn: BuiltInFunction): IncompleteFunctionType {
        m.builtin = fn;
        m.nodeImplementation = undefined;
        return inst;
      },
    });

    return inst;
  }

  return freeze({ make, reservedAnonymousName });
})();

export const FunctionType = (() => {
  function make(m: FunctionInitialization): FunctionType {
    const parameters: Readonly<ObjectType[]> = m.parameters;
    const returns   : Readonly<ObjectType[]> = m.returns;
    let onBuiltIn = (_0: (bif: BuiltInFunction) => void): FunctionType =>
      inst;
    let onNodeImplementation = (_0: (node: AstFunctionDefinitionNode) => void): FunctionType =>
      inst;
    const {
      builtin,
      nodeImplementation,
      name,
      callStrategy
    } = m;
    if (builtin && !nodeImplementation) {
      onBuiltIn = (fn: (bif: BuiltInFunction) => void): FunctionType => {
        fn(builtin);
        return inst;
      };
    } else if (nodeImplementation && !builtin) {
      onNodeImplementation =
        (fn: (node: AstFunctionDefinitionNode) => void): FunctionType => {
          fn(nodeImplementation as AstFunctionDefinitionNode);
          return inst;
        };
    } else {
      throw new Error('implementation was not set');
    }

    const inst = freeze({
      parameters: () => parameters,
      returns: () => returns,
      uid: memoize(Symbol),
      name: () => name,
      withCallStrategy: () => callStrategy,
      onNodeImplementation,
      composeWith(compositor: FunctionCompositor): FunctionCompositor {
        return compositor.pushBuiltin(builtin ?? (() => {
          throw new Error('no builtin');
        })(), returns);
      },
      onBuiltIn
    });
    return inst;
  }

  return freeze({
    make
  });
})();
