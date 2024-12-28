import { Helpers } from './helpers';
import { ObjectType } from './object_type';
import { type FunctionCompositor } from './function_compositor';
import { type CodeWriter } from './code_writer';

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

type CallingContextFactory =
  (callingContext: CallingContext) => CallingContext;

export interface CallingContext {
  // TODO refactor me to take only one object type
  canTake(...objTypes: Readonly<ObjectType[]>): boolean
}

export const CallingContext = freeze({
  toTakeAll: (_0: CallingContext) =>
    CallingContext.canTakeAll(),
  toTakeNothing: (_0: CallingContext) =>
    CallingContext.canTakeNothing(),
  toInherit: (callingContext: CallingContext) =>
    callingContext,
  canTakeAll: memoize((): CallingContext => freeze({
    canTake(..._00: Readonly<ObjectType[]>) { return true; }
  })),
  canTakeNothing: memoize((): CallingContext => freeze({
    canTake(...results: Readonly<ObjectType[]>) {
      return results.length === 0;
    }
  }))
});

export type BuiltInFunction =
  (callingContext: CallingContext, codeWriter: CodeWriter) => void;

export interface FunctionType {
  parameters: () => ObjectType,
  onBuiltIn: (fn: (bif: BuiltInFunction) => void) => FunctionType,
  // how do I prevent this type from becoming an implementation "dumping ground"?
  // visitWasmCodeWriter
  name: () => string,
  returns: () => ObjectType,
  uid: () => symbol,
  // have to know for instance, how to handle the lhs identifier
  // can't let this get tangled up with the intepreter (dependancy wise)
  // have the intepreter/compiler/whatever provide a table of strategies
  // let this function type choose which strategy is appropriate
  withCallStrategy: () => CallHandlingStrategies,
  // really also receiver too
  callingContextForParameters: (callingContext: CallingContext) => CallingContext,
  composeWith(compositor: FunctionCompositor): FunctionCompositor
};

export interface IncompleteFunctionType {
  setName: (name: string) => IncompleteFunctionType,
  setParameters: (args: ObjectType) => IncompleteFunctionType,
  setReturns: (args: ObjectType) => IncompleteFunctionType,
  setBuiltin: (fn: BuiltInFunction) => IncompleteFunctionType,
  setCallStrategy: (fn: () => CallHandlingStrategies) => IncompleteFunctionType,
  setContextToTakeAll: () => IncompleteFunctionType,
  implementationDoesNothing: () => IncompleteFunctionType,
  finish: () => FunctionType
};

type FunctionInitialization = {
  parameters        : ObjectType,
  returns           : ObjectType,
  builtin           : BuiltInFunction | undefined,
  name              : string,
  callStrategy      : CallHandlingStrategies,
  contextStrategy   : CallingContextFactory
};

const reservedAnonymousName = '<anonymous>';
function constructIncompleteFunctionType() {
  const m: FunctionInitialization = {
    parameters        : ObjectType.emptyTupleInstance(),
    returns           : ObjectType.emptyTupleInstance(),
    builtin           : undefined,
    name              : reservedAnonymousName,
    callStrategy      : uninitializedCallStrategies(),
    contextStrategy   : CallingContext.toInherit
  };

  const inst = freeze({
    setName(name: string): IncompleteFunctionType {
      if (name === reservedAnonymousName) {
        throw Error(`Cannot name function "${name}"`);
      }
      m.name = name;
      return inst;
    },
    implementationDoesNothing() {
      m.builtin = (_0: CallingContext, _1: CodeWriter) => {};
      return inst;
    },
    setParameters(args: ObjectType): IncompleteFunctionType {
      m.parameters = args;
      return inst;
    },
    setReturns(rets: ObjectType): IncompleteFunctionType {
      m.returns = rets;
      return inst;
    },
    setCallStrategy(fn: () => CallHandlingStrategies): IncompleteFunctionType {
      m.callStrategy = fn();
      return inst;
    },
    setContextToTakeAll() {
      m.contextStrategy = CallingContext.toTakeAll;
      return inst;
    },
    finish(): FunctionType {
      if (m.builtin === undefined) {
        throw new Error('Cannot complete function without an implementation');
      }
      // throws if "uninitialized"
      m.callStrategy.chooseReceiver(() => {});
      return FunctionType.make(m);
    },
    setBuiltin(fn: BuiltInFunction): IncompleteFunctionType {
      m.builtin = fn;
      return inst;
    }
  });
  return inst;
}

export const IncompleteFunctionType = freeze({
  make: constructIncompleteFunctionType,
  reservedAnonymousName
});

export const FunctionType = (() => {
  function make(m: FunctionInitialization): FunctionType {
    const parameters: ObjectType = m.parameters;
    const returns   : ObjectType = m.returns;
    let onBuiltIn = (_0: (bif: BuiltInFunction) => void): FunctionType =>
      inst;
    const {
      builtin,
      name,
      callStrategy
    } = m;
    if (builtin) {
      onBuiltIn = (fn: (bif: BuiltInFunction) => void): FunctionType => {
        fn(builtin);
        return inst;
      };
    } else {
      throw new Error('implementation was not set');
    }

    const inst = freeze({
      callingContextForParameters: m.contextStrategy,
      parameters: () => parameters,
      returns: () => returns,
      uid: memoize(Symbol),
      name: () => name,
      withCallStrategy: () => callStrategy,
      composeWith(compositor: FunctionCompositor): FunctionCompositor {
        return compositor.pushBuiltin(builtin ?? (() => {
          throw new Error('no builtin');
        })());
      },
      onBuiltIn
    });
    return inst;
  }

  return freeze({
    make
  });
})();
