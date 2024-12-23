import { FunctionCompositor } from './function_compositor';
import { CallHandlingStrategies, FunctionType, IncompleteFunctionType } from './function_type';
import { Helpers } from './helpers';
import { ObjectType } from './object_type';
import { VastNode } from './vast_node';

const { freeze, memoize } = Helpers;

function tupleTypeOfReturns(funcs: Readonly<FunctionType[]>) {
  return ObjectType.asTuple( funcs.map((func: FunctionType) => func.returns()) );
}

function functionCompositorFor(funcs: Readonly<FunctionType[]>): FunctionCompositor {
  const compositor = FunctionCompositor.make(IncompleteFunctionType.
    make().
    setReturns(tupleTypeOfReturns(funcs)).
    setCallStrategy(CallHandlingStrategies.noReceiver).
    implementationDoesNothing().
    finish());
  funcs.forEach((fnType: FunctionType) => {
    fnType.composeWith(compositor);
  });
  return compositor;
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

function construct(nodes: Readonly<VastNode[]>) {
  const { itCanBe } = VastNode;
  const funcTypes = (): Readonly<FunctionType[]> =>
    nodes.map((node: VastNode) => node.functionType());
  verifyNoNonZeroParameterFunctions(nodes);
  return freeze({
    objectType: memoize(() => ObjectType.
      asTuple(nodes.map((node :VastNode) => node.objectType()))),
    functionType: memoize(() => functionCompositorFor(funcTypes()).finish()),
    itCanBe: itCanBe(),
    uid: memoize(Symbol)
  }) satisfies VastNode;
}

export const VastTupleNode = freeze({ make: construct });
