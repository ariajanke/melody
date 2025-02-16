import { CodeWriter } from '../code_writer';
import { FunctionAbility } from '../function_ability';
import { CallingContext, type BuiltInFunction } from '../function_type';
import { Helpers } from '../helpers';
import { ObjectType } from '../object_type';
import { FunctionInitialization } from './function_initialization';
import { FunctionType } from './function_type';

const { freeze } = Helpers;

export interface IncompleteFunctionType {
  setName(name: string): IncompleteFunctionType,
  setParameters(args: ObjectType): IncompleteFunctionType,
  setReturns(args: ObjectType): IncompleteFunctionType,
  setBuiltin(fn: BuiltInFunction): IncompleteFunctionType,
  setContextToTakeAll(): IncompleteFunctionType,
  implementationDoesNothing(): IncompleteFunctionType,
  immediatelyKnowable(): IncompleteFunctionType
  finish: () => FunctionType
};

function construct
  (m: FunctionInitialization = FunctionInitialization.makeDefault())
{
  const inst = freeze({
    setName(name: string): IncompleteFunctionType {
      if (name === FunctionInitialization.reservedAnonymousName) {
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
    setContextToTakeAll() {
      m.contextStrategy = CallingContext.toTakeAll;
      return inst;
    },
    finish(): FunctionType {
      if (m.builtin === undefined) {
        throw new Error('Cannot complete function without an implementation');
      }
      return FunctionType.make(m);
    },
    immediatelyKnowable(): IncompleteFunctionType {
      m.ability = FunctionAbility.isEvaluatableNow;
      return inst;
    },
    setBuiltin(fn: BuiltInFunction): IncompleteFunctionType {
      m.builtin = fn;
      return inst;
    }
  });
  return inst;
}

export const IncompleteFunctionType = freeze({
  make: construct
});
