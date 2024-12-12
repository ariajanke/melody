import { Helpers } from './helpers';
import { CallHandlingStrategies, IncompleteFunctionType} from './function_type';
import { ObjectType } from './object_type';
import { type PersistentStack } from './persistent_stack';
import { type ContextVariable } from './context_variable';

const { freeze, memoize } = Helpers;

function makeIntegerType() {
  const { noReceiver, withReceiver } = CallHandlingStrategies;
  const integer_ = ObjectType.make('Integer');
  
  const add = IncompleteFunctionType.
    make().
    setName('+').
    setCallStrategy(withReceiver).
    setParameters(integer_.decomposeAsParameters()).
    setReturns  ([ integer_ ]).
    setBuiltin((stack: PersistentStack<ContextVariable>) =>
      {
        const lhs = stack.pop();
        const rhs = stack.pop();
        
        stack.push().set(rhs.asNumber() + lhs.asNumber());
      }).
    finish();

  const sub = IncompleteFunctionType.
    make().
    setName('-').
    setCallStrategy(withReceiver).
    setParameters(integer_.decomposeAsParameters()).
    setReturns  ([ integer_ ]).
    setBuiltin((stack: PersistentStack<ContextVariable>) =>
      {
        const lhs = stack.pop();
        const rhs = stack.pop();
        
        stack.push().set(rhs.asNumber() - lhs.asNumber());
      }).
    finish();

  const mul = IncompleteFunctionType.
    make().
    setName('*').
    setCallStrategy(withReceiver).
    setParameters(integer_.decomposeAsParameters()).
    setReturns  ([ integer_ ]).
    setBuiltin((stack: PersistentStack<ContextVariable>) =>
      {
        const lhs = stack.pop();
        const rhs = stack.pop();
        stack.push().set(rhs.asNumber()*lhs.asNumber());
      }).
    finish();

  const assign = IncompleteFunctionType.
    make().
    setName(':=').
    setCallStrategy(noReceiver).
    setParameters(integer_.decomposeAsParameters()).
    setReturns  ([ integer_ ]).
    setBuiltin((_0: PersistentStack<ContextVariable>) => {}).
    finish();
  return integer_.setLookUp({
    ['*' ]: mul,
    ['+' ]: add,
    ['-' ]: sub,
    [':=']: assign
  });
}

export const IntegerType = freeze({
  instance: memoize(makeIntegerType)
});
