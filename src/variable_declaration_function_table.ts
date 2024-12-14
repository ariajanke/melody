import { type FunctionLookUpTable } from './function_look_up_table';
import { BuiltInFunction, CallHandlingStrategies, type FunctionType, IncompleteFunctionType } from './function_type';
import { Helpers } from './helpers';
import { type ObjectType } from './object_type';
import { PersistentStack } from './persistent_stack';
import { MemoryArray } from './memory_array';

const { freeze } = Helpers;

export interface VariableDeclarationFunctionTable extends FunctionLookUpTable {
  offset(): number
};

export const VariableDeclarationFunctionTable = freeze({
  make(varType: ObjectType, operator: string, memoryOffset: number) {
    const { noReceiver } = CallHandlingStrategies;
    const { uid } = varType;
    const mGetter = IncompleteFunctionType.
      make().
      setCallStrategy(noReceiver).
      setParameters([]).
      setReturns([varType]).
      setBuiltin((stack: PersistentStack<number>, memory: MemoryArray) =>
      {
        stack.push( memory.load( memoryOffset ) );
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
        setParameters([varType]).
        setReturns([varType]).
        setBuiltin((stack: PersistentStack<number>, memory: MemoryArray) =>
        {
          const cvarToStore = stack.pop();
          memory.store(memoryOffset, cvarToStore);
          // also do getter things
          mGetter.onBuiltIn((bif: BuiltInFunction) => {
            bif(stack, memory);
          });
        }).
        finish();
      })();
    return freeze({
      offset: () => memoryOffset,
      byParameters(args: Readonly<ObjectType[]>): FunctionType | undefined {
        if (args.length === 0) {
          return mGetter;
        } else if (args[0].uid() === uid()) {
          return mSetter;
        }
        return undefined;
      },
      variableType: varType
    }) satisfies VariableDeclarationFunctionTable;
  }
});
