import { ContextVariable } from './context_variable';
import { type FunctionLookUpTable } from './function_look_up_table';
import { BuiltInFunction, CallHandlingStrategies, type FunctionType, IncompleteFunctionType } from './function_type';
import { Helpers } from './helpers';
import { type ObjectType } from './object_type';
import { PersistentStack } from './persistent_stack';
import { MemoryArray } from './memory_array';

const { freeze } = Helpers;

export interface VariableDeclarationFunctionTable extends FunctionLookUpTable {
  // variableType: () => ObjectType
};

export const VariableDeclarationFunctionTable = freeze({
  make(cvar: ContextVariable, operator: string, memoryOffset: number)
  {
    const { noReceiver } = CallHandlingStrategies;
    const { uid } = cvar.type();
    const mGetter = IncompleteFunctionType.
      make().
      setCallStrategy(noReceiver).
      setParameters([]).
      setReturns([cvar.type()]).
      setBuiltin((stack: PersistentStack<ContextVariable>, memory: MemoryArray) =>
      {
        memory.load(memoryOffset).copyTo( stack.push() );
      }).
      finish();
    // still need setter (once though) for the "=" case
    // does the actual store
    const mSetter = (() => {
      if (operator !== ':=')
        { return undefined; }
      return IncompleteFunctionType.
        make().
        setCallStrategy(noReceiver).
        setParameters([cvar.type()]).
        setReturns([cvar.type()]).
        setBuiltin((stack: PersistentStack<ContextVariable>, memory: MemoryArray) =>
        {
          const cvarToStore = stack.pop();
          memory.store(memoryOffset, cvarToStore);
          cvarToStore.copyTo( stack.push() );
          // also do getter things
          mGetter.onBuiltIn((bif: BuiltInFunction) => {
            bif(stack, memory);
          });
        }).
        finish();
      })();
    return freeze({
      byParameters(args: Readonly<ObjectType[]>): FunctionType | undefined {
        if (args.length === 0) {
          return mGetter;
        } else if (args[0].uid() === uid()) {
          return mSetter;
        }
        return undefined;
      },
      variableType: cvar.type
    }) satisfies FunctionLookUpTable;
  }
});
