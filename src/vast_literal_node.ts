import {
  CallHandlingStrategies,
  CallingContext,
  CodeWriter,
  IncompleteFunctionType } from './function_type';
import { Helpers } from './helpers';
import { ObjectType } from './object_type';
import { VastNode } from './vast_node';

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
        writer.pushInteger(mValue);
      }).
      finish()),
    itCanBe: itCanBe(ableToBe.evaluated),
    uid: memoize(Symbol)
  });
}

export const VastStringLiteralNode = freeze({
  make: (mStringType: ObjectType, mValue: number): VastNode =>
    construct(mStringType, mValue, `$String.'${mValue}'`)
  //  {
  //   const { itCanBe, ableToBe } = VastNode;
  //   const { noReceiver } = CallHandlingStrategies;
  //   return freeze({
  //     objectType: () => mStringType,
  //     functionType: memoize(() => IncompleteFunctionType.
  //       make().
  //       setParameters(ObjectType.emptyTupleInstance()).
  //       setReturns(mStringType).
  //       setCallStrategy(noReceiver).
  //       setName(`$String.'${mValue}'`).
  //       setBuiltin((callingContext: CallingContext, writer: CodeWriter) => {
  //         if (!callingContext.canTake(mStringType))
  //           { return (_0: CallingContext, _1: CodeWriter) => {}; }
  //         writer.pushInteger(mValue);
  //       }).
  //       finish()),
  //     itCanBe: itCanBe(ableToBe.evaluated),
  //     uid: memoize(Symbol)
  //   });
  // }
});

export const VastIntegerLiteralNode = freeze({
  make: (mIntegerType: ObjectType, mValue: number): VastNode =>
    construct(mIntegerType, mValue, `.${mValue}`)
  // {
  //   const { itCanBe, ableToBe } = VastNode;
  //   const { noReceiver } = CallHandlingStrategies;
  //   return freeze({
  //     objectType: () => mIntegerType,
  //     functionType: memoize(() => IncompleteFunctionType.
  //       make().
  //       setParameters(ObjectType.emptyTupleInstance()).
  //       setReturns(mIntegerType).
  //       setCallStrategy(noReceiver).
  //       setName(`.${mValue}`).
  //       setBuiltin((callingContext: CallingContext, writer: CodeWriter) => {
  //         if (!callingContext.canTake(mIntegerType))
  //           { return (_0: CallingContext, _1: CodeWriter) => {}; }
  //         writer.pushInteger(mValue);
  //       }).
  //       finish()),
  //     itCanBe: itCanBe(ableToBe.evaluated),
  //     uid: memoize(Symbol)
  //   });
  // }
});
