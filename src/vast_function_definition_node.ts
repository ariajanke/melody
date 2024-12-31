import { 
  BuiltInFunction,
  CallHandlingStrategies,
  CallingContext,
  IncompleteFunctionType } from './function_type';
import { Helpers } from './helpers';
import { ObjectType } from './object_type';
import { VastNode } from './vast_node';
import { CodeWriter } from './code_writer';

const { freeze, memoize } = Helpers;

const VastReturningNode = freeze({
  make(cleanupAfter: VastNode, returning: VastNode): VastNode {
    function functionType() {
      const cleanupAfterFunc = cleanupAfter.functionType();
      const returningFunc = returning.functionType();
      return IncompleteFunctionType.
        make().
        setParameters(ObjectType.emptyTupleInstance()).
        setReturns(returningFunc.returns()).
        setCallStrategy(CallHandlingStrategies.noReceiver).
        setBuiltin((callingContext: CallingContext, codeWriter: CodeWriter) => {
          cleanupAfterFunc.onBuiltIn((bif: BuiltInFunction) => {
            bif(CallingContext.canTakeNothing(), codeWriter);
          });
          
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
  function makeFunctionType() {
    return IncompleteFunctionType.
      make().
      // will have a receiver in the future depending on call site
      setCallStrategy(CallHandlingStrategies.noReceiver).
      setParameters(ObjectType.emptyTupleInstance()).
      setReturns(functionType().returns()).
      setBuiltin((CallingContext: CallingContext, codeWriter: CodeWriter) => {
        codeWriter.pushFunctionIndex((codeWriter: CodeWriter) => {
          functionType().
            onBuiltIn((bif: BuiltInFunction) => {
              bif(CallingContext, codeWriter);
            });
        });
      }).
      finish();
  }
  return freeze({
    objectType: () => mContextType,
    functionType: memoize(makeFunctionType),
    itCanBe,
    uid
  }) satisfies VastNode;
}

export const VastFunctionDefinitionNode = freeze({ make: construct });
