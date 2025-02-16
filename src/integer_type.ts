import { Helpers } from './helpers';
import {
  CallingContext,
  IncompleteFunctionType
} from './function_type';
import { type CodeWriter } from './code_writer';
import { WritableObjectType } from './writable_object_type';

const { freeze, memoize } = Helpers;

function makeIntegerType() {
  const mutable_integer_type = WritableObjectType.make().
    setName('Integer').
    setToIntegerSize();
  const integer_ = mutable_integer_type.objectType();

  const onTakeInteger = (fn: (codeWriter: CodeWriter) => void) => {
    return (callingContext: CallingContext, codeWriter: CodeWriter) => {
      if (callingContext.canTake(integer_)) {
        fn(codeWriter);
      } else {
        // just clean up parameters (and receiver)
        codeWriter.drop().drop();
      }
    };
  };
  
  const add = IncompleteFunctionType.
    make().
    setName('+').
    // callWithReceiver().
    immediatelyKnowable().
    setParameters(integer_).
    setReturns  ( integer_ ).
    setBuiltin(onTakeInteger((writer: CodeWriter) => {
      writer.addIntegers();
    })).
    finish();

  const sub = IncompleteFunctionType.
    make().
    setName('-').
    // callWithReceiver().
    immediatelyKnowable().
    setParameters(integer_).
    setReturns  ( integer_ ).
    setBuiltin(onTakeInteger((writer: CodeWriter) => {
      writer.subtractIntegers();
    })).
    finish();

  const mul = IncompleteFunctionType.
    make().
    setName('*').
    // callWithReceiver().
    immediatelyKnowable().
    setParameters(integer_).
    setReturns  ( integer_ ).
    setBuiltin(onTakeInteger((writer: CodeWriter) => {
      writer.multiplyIntegers();
    })).
    finish();

  const assign = IncompleteFunctionType.
    make().
    setName(':=').
    // callWithReceiver().
    immediatelyKnowable().
    setParameters(integer_).
    setReturns  ( integer_ ).
    setBuiltin((_0: CallingContext, _1: CodeWriter) => {}).
    finish();

  mutable_integer_type.
    pushFunctionTypes({
      ['*' ]: mul,
      ['+' ]: add,
      ['-' ]: sub,
      [':=']: assign
      // a := (something)
      // as an alias for
      // $.a(something)?
      // what about overloading ":="?
    });
  return integer_;
}

export const IntegerType = freeze({
  instance: memoize(makeIntegerType)
});
