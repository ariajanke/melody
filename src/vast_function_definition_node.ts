import { 
  BuiltInFunction,
  CallHandlingStrategies,
  CallingContext,
  CodeWriter,
  IncompleteFunctionType } from './function_type';
import { Helpers } from './helpers';
import { ObjectType } from './object_type';
import { VastNode } from './vast_node';

const { freeze, memoize } = Helpers;

const VastReturningNode = freeze({
  make(cleanupAfter: VastNode, returning: VastNode): VastNode {
    function functionType() {
      const cleanupAfterFunc = cleanupAfter.functionType();
      const returningFunc = returning.functionType();
      const cleanUpPopCount = cleanupAfterFunc.
        returns().
        decompose().
        map((objType: ObjectType) => objType.sizeInWords()).
        reduce((prev: number, cur: number) => prev + cur, 0);
      return IncompleteFunctionType.
        make().
        setParameters(ObjectType.emptyTupleInstance()).
        setReturns(returningFunc.returns()).
        setCallStrategy(CallHandlingStrategies.noReceiver).
        setBuiltin((callingContext: CallingContext, codeWriter: CodeWriter) => {
          cleanupAfterFunc.onBuiltIn((bif: BuiltInFunction) => {
            bif(CallingContext.canTakeNothing(), codeWriter);
          });
          for (let i = 0; i < cleanUpPopCount; ++i)
            codeWriter.drop();
          returningFunc.onBuiltIn((bif: BuiltInFunction) => {
            bif(callingContext, codeWriter);
          });
        }).
        finish();
    }
    const { itCanBe } = VastNode;
    return freeze({
      objectType: returning.objectType,
      functionType: memoize(functionType),
      itCanBe: itCanBe(),
      uid: memoize(Symbol)
    });
  }
});

function construct(lineNodes: Readonly<VastNode[]>, mContextType: ObjectType) {
  // calling context:
  // only emit (call subsequent nodes) if it may take my context type
  // on my *own* returning node, take anything
  const { functionType, itCanBe, uid } = lineNodes.
    reduce((prev: VastNode, cur: VastNode) => VastReturningNode.make(prev, cur));
  return freeze({
    objectType: () => mContextType,
    functionType,
    itCanBe,
    uid
  }) satisfies VastNode;
}

export const VastFunctionDefinitionNode = freeze({ make: construct });
