import {
  CallingContext,
  IncompleteFunctionType
} from './function_type';
import { Helpers } from './helpers';
import { ObjectType } from './object_type';
import { VastNode } from './vast_node';
import { CodeWriter } from './code_writer';
import { VastReturningNode } from './vast_returning_node';

const { freeze, memoize } = Helpers;

function construct
  (mLineNodes: Readonly<VastNode[]>,
   mFunctionType: ObjectType) {
  // calling context:
  // only emit (call subsequent nodes) if it may take my context type
  // on my *own* returning node, take anything
  const { functionType, itCanBe, uid } = VastReturningNode.make(mLineNodes);
  function makeFunctionType() {
    const returnType = functionType().returns();
    return IncompleteFunctionType.
      make().
      setParameters(ObjectType.emptyTupleInstance()).
      setReturns(mFunctionType).
      setBuiltin((callingContext: CallingContext, codeWriter: CodeWriter) => {
        codeWriter.pushFunctionIndex(returnType, (codeWriter: CodeWriter) => {
          functionType().builtIn()(callingContext, codeWriter);
        });
        if (!callingContext.canTake(mFunctionType)) {
          codeWriter.drop();
        }
      }).
      finish();
  }
  const inst = freeze({
    functionType: memoize(() => makeFunctionType()),
    itCanBe,
    uid,
    decompose: (): Readonly<VastNode[]> => [inst]
  }) satisfies VastNode;
  return inst;
}

export const VastFunctionDefinitionNode = freeze({ make: construct });
