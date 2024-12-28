import {
  CallHandlingStrategies,
  CallingContext,
  IncompleteFunctionType } from './function_type';
import { Helpers } from './helpers';
import { ObjectType } from './object_type';
import { VastNode } from './vast_node';
import { type CodeWriter } from './code_writer';

const { freeze, memoize } = Helpers;

function construct(mType: ObjectType, mValue: number, mName: string): VastNode {
  const { itCanBe, ableToBe } = VastNode;
  const { noReceiver } = CallHandlingStrategies;
  return freeze({
    objectType: () => mType,
    functionType: memoize(() => IncompleteFunctionType.
      make().
      setParameters(ObjectType.emptyTupleInstance()).
      setReturns(mType).
      setCallStrategy(noReceiver).
      setName(mName).
      setBuiltin((callingContext: CallingContext, writer: CodeWriter) => {
        if (!callingContext.canTake(mType))
          { return (_0: CallingContext, _1: CodeWriter) => {}; }
        writer.pushRepresentation(mValue);
      }).
      finish()),
    itCanBe: itCanBe(ableToBe.evaluated),
    uid: memoize(Symbol)
  });
}

export const VastStringLiteralNode = freeze({
  make: (mStringType: ObjectType, mValue: number): VastNode =>
    construct(mStringType, mValue, `$String.'${mValue}'`)
});

export const VastIntegerLiteralNode = freeze({
  make: (mIntegerType: ObjectType, mValue: number): VastNode =>
    construct(mIntegerType, mValue, `.${mValue}`)
});
