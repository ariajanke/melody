import { Helpers } from './helpers';
import { type ContextVariable } from './context_variable';
import { type PersistentStack } from './persistent_stack';

const { freeze } = Helpers;

export const ParameterFit = freeze({
  isLike: Symbol(),
  isType: Symbol(),
  isInterface: Symbol()
});

export type BuiltInFunction = (stack: PersistentStack<ContextVariable>) => void;

interface FunctionTypeBase {
  arguments_: () => Readonly<symbol[]>,
  builtIn: () => BuiltInFunction | undefined,
  isComplete: () => boolean,
  name: () => string,
  pushReceiverStrategy: (fn: () => void) => void,
  returns: () => Readonly<symbol[]>,
  uid: () => symbol,
};

export interface FunctionType extends FunctionTypeBase {
  
};

export interface IncompleteFunctionType extends FunctionTypeBase {
  setName: (name: string) => IncompleteFunctionType,
  setArguments: (args: Readonly<symbol[]>) => IncompleteFunctionType,
  setReturns: (args: Readonly<symbol[]>) => IncompleteFunctionType,
  setBuiltin: (fn: BuiltInFunction) => IncompleteFunctionType,
  noReceiver: () => IncompleteFunctionType,
  finish: () => FunctionType
};

export const IncompleteFunctionType = (() => {
  const reservedAnonymouseName = '<anonymous>';
  const pushReceiver = 
    (fn: () => void) =>
    { fn(); };
  const pushNothing = (_0: () => void) => {};
  function make(): IncompleteFunctionType {
    const mUid = Symbol();
    const mArguments_: symbol[] = [];
    const mReturns   : symbol[] = [];
    let mBuiltin: BuiltInFunction | undefined = undefined;
    let mName = reservedAnonymouseName;
    let mPushReceiverStrategy = pushReceiver;

    const inst = freeze({
      arguments_,
      returns,
      uid,
      isComplete,
      setName,
      setArguments,
      setReturns,
      name,
      finish,
      setBuiltin,
      builtIn: () => mBuiltin,
      noReceiver,
      pushReceiverStrategy(fn: () => void)
        { mPushReceiverStrategy(fn); }
    });

    function noReceiver(): IncompleteFunctionType {
      mPushReceiverStrategy = pushNothing;
      return inst;
    }

    function arguments_(): Readonly<symbol[]>
      { return mArguments_; }

    function returns(): Readonly<symbol[]>
      { return mReturns; }

    function uid(): symbol { return mUid; }

    function isComplete(): boolean { return false; }

    function setName(name: string): IncompleteFunctionType {
      if (name === reservedAnonymouseName) {
        throw Error(`Cannot name function "${name}"`);
      }
      mName = name;
      return inst;
    }

    function setArguments(args: Readonly<symbol[]>): IncompleteFunctionType {
      mArguments_.length = 0;
      mArguments_.push(...args);
      return inst;
    }

    function setReturns(rets: Readonly<symbol[]>): IncompleteFunctionType {
      mReturns.length = 0;
      mReturns.push(...rets);
      return inst;
    }

    function name() { return mName; }

    function finish() {
      return FunctionType.make(inst);
    }

    function setBuiltin(fn: BuiltInFunction): IncompleteFunctionType {
      mBuiltin = fn;
      return inst;
    }
    return inst;
  }

  return freeze({ make, reservedAnonymouseName });
})();

export const FunctionType = (() => {

  function make(base: FunctionTypeBase): FunctionType {
    const {
      arguments_, 
      returns,
      uid,
      name,
      builtIn,
      pushReceiverStrategy
    } = base;

    const inst = freeze({
      arguments_,
      returns,
      uid,
      name,
      isComplete: () => true,
      builtIn,
      pushReceiverStrategy
    });
    return inst;
  }

  return freeze({
    make
  });
})();
