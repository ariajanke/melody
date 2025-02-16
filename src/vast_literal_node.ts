import {
  CallingContext,
  IncompleteFunctionType } from './function_type';
import { Helpers } from './helpers';
import { ObjectType } from './object_type';
import { VastNode } from './vast_node';
import { type CodeWriter } from './code_writer';
import { FunctionAbility } from './function_ability';

const { freeze, memoize } = Helpers;

function construct(mType: ObjectType, mValue: number, mName: string): VastNode {
  const inst = freeze({
    functionType: memoize(() => IncompleteFunctionType.
      make().
      immediatelyKnowable().
      setParameters(ObjectType.emptyTupleInstance()).
      setReturns(mType).
      setName(mName).
      setBuiltin((callingContext: CallingContext, writer: CodeWriter) => {
        if (!callingContext.canTake(mType))
          { return; }
        writer.pushRepresentation(mValue);
      }).
      finish()),
    itCanBe: FunctionAbility.isEvaluatableNow,
    uid: memoize(Symbol),
    decompose: () => [inst]
  });
  return inst satisfies VastNode;
}

export const VastStringLiteralNode = freeze({
  make: (mStringType: ObjectType, mValue: number): VastNode =>
    construct(mStringType, mValue, `$String.'${mValue}'`)
});

export const VastIntegerLiteralNode = freeze({
  make: (mIntegerType: ObjectType, mValue: number): VastNode =>
    construct(mIntegerType, mValue, `.${mValue}`)
});
