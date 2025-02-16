import { CodeWriter } from '../code_writer';
import { FunctionLookUpTable } from '../function_look_up_table';
import {
  CallingContext,
  FunctionType,
  IncompleteFunctionType
} from '../function_type';
import { Helpers } from '../helpers';
import { ObjectType } from '../object_type';
import { VastNode } from '../vast_node';
import { WritableObjectType } from '../writable_object_type';
import { LetNameElement } from './let_declarations_retrieval';

const { freeze } = Helpers;

function make
  (mContextType: ObjectType,
   mValueNode: VastNode,
   mLetName: LetNameElement)
{
  const methodName = `=${mLetName.name}`;
  const isProcessTimeConstant = 
    mValueNode.itCanBe().evaluatedNow() && mLetName.operator === '=';
  function onNormalInitializer(): FunctionType {
    const funcTypes = mLetName.name.split(',').map((name: string) =>
      mContextType.lookUp(`.${name}`) ?? (() => {
        throw new Error(`".${name}" was not defined by context`);
      })()).
      map((val: FunctionLookUpTable) => 
        val.oneTimeSetter() ?? (() => { throw new Error('umm'); })());

    return IncompleteFunctionType.
      make().
      setName(methodName).
      setParameters(mValueNode.functionType().returns()).
      setReturns(mValueNode.functionType().returns()).
      setBuiltin((cc: CallingContext, cw: CodeWriter) => {
        funcTypes.forEach((fnType: FunctionType) => {
          fnType.builtIn()(cc, cw);
        });
      }).
      finish();
  }

  return freeze({
    mergeInto(mDestination: WritableObjectType): WritableObjectType {
      if (isProcessTimeConstant)
        { return mDestination; }
      mDestination.pushFunctionTypes({ [methodName]: onNormalInitializer() });
      return mDestination;
    }
  });
}

export const VariableInitializerBuilder = freeze({ make });
