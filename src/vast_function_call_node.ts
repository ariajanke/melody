import { CodeWriter } from './code_writer';
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
  pushVastAsParameters(node: VastNode): BuiltInFunction[] {
    const bifs: BuiltInFunction[] = [];
    const pushBif = (bif: BuiltInFunction) => bifs.push(bif);
    pushBif(node.functionType().builtIn());
    return bifs;
  },
  make(mFunctionType: FunctionType, mReceiver: VastNode, mParameters: VastNode) {
    VastFunctionCallNode.validateFunctionParameters(
      mFunctionType,
      mParameters.functionType().returns(),
      (msg: string) => { throw new Error(msg); });

    const functionType = memoize(() => {
      const bifs: BuiltInFunction[] = [];
      const pushBif = (bif: BuiltInFunction) => bifs.push(bif);
      pushBif(mReceiver.functionType().builtIn());

      bifs.push(...VastFunctionCallNode.pushVastAsParameters(mParameters));
      return IncompleteFunctionType.
        make().
        setParameters(ObjectType.emptyTupleInstance()).
        setReturns(mFunctionType.returns()).
        setBuiltin((context: CallingContext, writer: CodeWriter) => {
          bifs.forEach((bif: BuiltInFunction) =>
            bif(CallingContext.canTakeAll(), writer));
          // the function itself is responsible for cleaning up after itself
          mFunctionType.builtIn()(context, writer);
        }).
        finish();
    });
      
    const inst = freeze({
      functionType,
      itCanBe: memoize(() => FunctionAbility.
        reductionOf(/* v TODO: and the function itself v */
                    FunctionAbility.isKnownableLater(),
                    
                    mReceiver.itCanBe(),
                    mParameters.itCanBe())),
      uid: memoize(Symbol),
      decompose: () => [inst]
    });
    return inst satisfies VastNode;
  }
});
