import { FunctionCompositor } from './function_compositor';
import { FunctionType } from './function_type';
import { Helpers } from './helpers';
import { ObjectType } from './object_type';
import { VastNode } from './vast_node';

const { freeze, memoize } = Helpers;

export const VastFunctionCallNode = freeze({
  // we try and keep validating class methods that can work with both
  // VAST as well as AST nodes
  validateFunctionParameters:
    (functionType: FunctionType,
     parameterType: ObjectType,
     onError: (msg: string) => void): void =>
  {
    let msg: string | undefined = undefined;
    const givenParams = parameterType.decompose();
    const expectedParams = functionType.parameters().decompose();
    if (givenParams.length !== expectedParams.length) {
      msg = `function type expected ${expectedParams.length} parameters`; 
    }
    msg || givenParams.forEach((givenParam: ObjectType, idx: number) => {
      const expectedParam = expectedParams[idx];
      if (msg || givenParam.uid() === expectedParam.uid())
        { return; }
      msg = `Parameter (${idx}) expected to be a "${expectedParam.name()}", got a "${givenParam.name()}" instead`;
    });
    msg && onError( msg );
    return undefined;
  },
  make(mFunctionType: FunctionType, mReceiver: VastNode, mParameters: VastNode) {
    VastFunctionCallNode.
      validateFunctionParameters(mFunctionType, mParameters.objectType(), (msg: string) =>
        { throw new Error(msg); });

    const compositor = () => FunctionCompositor.make(mFunctionType);
    
    const functionType = memoize(() => {
      let mCompositor = compositor();
      mFunctionType.withCallStrategy().chooseReceiver(() => {
        mCompositor = mReceiver.functionType().composeWith(mCompositor);
      });
      mCompositor = mParameters.functionType().composeWith(mCompositor);
      return mCompositor.finish();  
    });
      
    return freeze({
      objectType: memoize(() => mFunctionType.returns()),
      functionType,
      itCanBe: () => false,
      uid: memoize(Symbol)
    }) satisfies VastNode;
  }
});
