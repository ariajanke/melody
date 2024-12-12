import { Helpers } from './helpers';
import { CallHandlingStrategies, IncompleteFunctionType } from './function_type';
import { type PersistentStack } from './persistent_stack';
import { type ContextVariable } from './context_variable';
import { FunctionType } from './function_type';
import { StringPool } from './context_type';
import { type FunctionLookUpTable } from './function_look_up_table';
import { ObjectType } from './object_type';

const { freeze } = Helpers;

export const PutsFunctionLookUpTable = freeze({
  make: (mGetStringPool: () => StringPool, mPutsFn: (s: string) => void): FunctionLookUpTable => {
    const mImplementations: FunctionType[] = [];

    return freeze({
      byParameters(types: Readonly<ObjectType[]>): FunctionType | undefined {
        mImplementations.length = types.length;
        return mImplementations[types.length - 1] ??=
          IncompleteFunctionType.
            make().
            setCallStrategy(CallHandlingStrategies.noReceiver).
            setBuiltin((stack: PersistentStack<ContextVariable>) => {
              // need a canonical order for arguments
              const strs: string[] = [];
              for (let i = 0; i < types.length; ++i) {
                 strs.push(stack.pop().asString());
              }
              strs.reverse().forEach(mPutsFn);
            }).
            setParameters(types).
            setReturns([]).
            setName('puts').
            finish();
      }
    });
  }
});
