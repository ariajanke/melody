import {
  BuiltInFunction,
  CallingContext,
  FunctionType,
  IncompleteFunctionType
} from './function_type';
import { Helpers } from './helpers';
import { ObjectType } from './object_type';
import { VastNode } from './vast_node';
import { FunctionAbility } from './function_ability';
import { CodeWriter } from './code_writer';

const { freeze, memoize } = Helpers;

function tupleTypeOfReturns(funcs: Readonly<FunctionType[]>) {
  return ObjectType.asTuple( funcs.map((func: FunctionType) => func.returns()) );
}

function isZeroParameterFunction(node: VastNode) {
  return node.functionType().parameters().decompose().length === 0;
}

// double negative, but needed something carefully addressing semantics
function verifyNoNonZeroParameterFunctions(nodes: Readonly<VastNode[]>) {
  if (nodes.length === 0)
    { return; }
  const allZero = nodes.
    map(isZeroParameterFunction).
    reduce((prev: boolean, cur: boolean) => prev && cur);
  if (allZero)
    { return; }
  throw new Error('All nodes must be zero parameter functions');
}

function abilityForEmptyTuple() {
  return FunctionAbility.isEvaluatableNow();
}

const emptyTuple = memoize((): VastNode => {
  return freeze({
    functionType: memoize(() => IncompleteFunctionType.
      make().
      immediatelyKnowable().
      implementationDoesNothing().
      setParameters(ObjectType.emptyTupleInstance()).
      setReturns(ObjectType.emptyTupleInstance()).
      finish()),
    itCanBe: () => FunctionAbility.isEvaluatableNow(),
    uid: memoize(Symbol),
    decompose: () => []
  });
});

function construct(nodes: Readonly<VastNode[]>) {
  if (nodes.length === 0)
    { return emptyTuple(); }
  else if (nodes.length === 1)
    { return nodes[0]; }
  
  verifyNoNonZeroParameterFunctions(nodes);

  const itCanBe = memoize(() => {
    return nodes.
      map((node: VastNode) => node.itCanBe()).
      reduce((prev: FunctionAbility, cur: FunctionAbility) =>
        cur.intersectWith(prev), abilityForEmptyTuple());
  });

  return freeze({
    functionType: memoize(() => {
      const funcTypes = memoize((): Readonly<FunctionType[]> =>
        nodes.map((node: VastNode) => node.functionType()));
      const returnType = tupleTypeOfReturns(funcTypes());
      const bifs: BuiltInFunction[] = [];
      const pushBif = (bif: BuiltInFunction) => bifs.push(bif);
      nodes.forEach((node: VastNode) => {
        pushBif(node.functionType().builtIn());
      });
      bifs.reverse();

      const incmp = IncompleteFunctionType.
        make().
        setReturns(returnType).
        setParameters(ObjectType.emptyTupleInstance()).
        setBuiltin((context: CallingContext, writer: CodeWriter) => {
          bifs.forEach((bif: BuiltInFunction) => bif(context, writer));
        });
      if (itCanBe().evaluatedNow()) {
        incmp.immediatelyKnowable();
      }
      return incmp.finish();
    }),
    itCanBe,
    uid: memoize(Symbol),
    decompose: () => nodes
  }) satisfies VastNode;
}

export const VastTupleNode = freeze({ make: construct, emptyTuple });
