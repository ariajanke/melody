import {
  CallingContext,
  IncompleteFunctionType
} from './function_type';
import { Helpers } from './helpers';
import { ObjectType } from './object_type';
import { VastNode } from './vast_node';
import { CodeWriter } from './code_writer';
import { FunctionAbility } from './function_ability';

const { freeze, memoize } = Helpers;

function construct(cleanupAfter: VastNode, returning: VastNode): VastNode {
  function functionType() {
    const cleanupAfterFunc = cleanupAfter.functionType();
    const returningFunc = returning.functionType();
    return IncompleteFunctionType.
      make().
      setParameters(ObjectType.emptyTupleInstance()).
      setReturns(returningFunc.returns()).
      setBuiltin((callingContext: CallingContext, codeWriter: CodeWriter) => {
        cleanupAfterFunc.builtIn()(CallingContext.canTakeNothing(), codeWriter);
        returningFunc.builtIn()(callingContext, codeWriter);
      }).
      finish();
  }
  const inst = freeze({
    functionType: memoize(functionType),
    itCanBe: () => cleanupAfter.itCanBe().intersectWith(returning.itCanBe()),
    uid: memoize(Symbol),
    decompose: () => [inst]
  });
  return inst;
}

const emptyFunctionType = memoize(() =>
  IncompleteFunctionType.make().
    implementationDoesNothing().
    finish());

function constructForZero() {
  const inst = freeze({
    functionType: emptyFunctionType,
    itCanBe: FunctionAbility.isEvaluatableNow,
    uid: memoize(Symbol),
    decompose: () => [inst]
  });
  return inst satisfies VastNode;
}

function make(mLineNodes: Readonly<VastNode[]>): VastNode {
  if (mLineNodes.length === 0)
    { return constructForZero(); }
  return mLineNodes.reduce(construct);
}

export const VastReturningNode = freeze({ make });
