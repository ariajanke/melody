import { type CodeWriter } from './code_writer';
import { Helpers } from './helpers';
import { ObjectType } from './object_type';
import * as ft from './function_type/function_type';
import * as ift from './function_type/incomplete_function_type';

const { freeze, memoize } = Helpers;

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

export const FunctionType = ft.FunctionType;
export type  FunctionType = ft.FunctionType;
export const IncompleteFunctionType = ift.IncompleteFunctionType;
export type  IncompleteFunctionType = ift.IncompleteFunctionType;
