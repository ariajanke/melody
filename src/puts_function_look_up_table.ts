import { Helpers } from './helpers';
import { CallHandlingStrategies, IncompleteFunctionType } from './function_type';
import { type PersistentStack } from './persistent_stack';
import { FunctionType } from './function_type';
import { StringPool } from './context_type';
import { type FunctionLookUpTable } from './function_look_up_table';
import { ObjectType } from './object_type';

const { freeze } = Helpers;

export const PutsFunctionLookUpTable = freeze({
  make: (mStringPool: StringPool, mPutsFn: (s: string) => void): FunctionLookUpTable => {
    type ImplementationTable = {
      implementation: FunctionType | undefined
      [uid: symbol]: ImplementationTable
    };
    const mTable: ImplementationTable = { implementation: undefined };

    function makeAsString(objType: ObjectType) {
      if (objType.name() === 'String') {
        return (stack: PersistentStack<number>) => {
          const str = mStringPool.reverseLookUp(stack.pop());
          if (str) {
            return str;
          }
          return '??UNKNOWN??';
        };
      }
      return (stack: PersistentStack<number>) =>
        `${stack.pop()}`;
    }

    function makeImplementation(objTypes: Readonly<ObjectType[]>) {
      const allAsStrings = objTypes.
        map((obj: ObjectType) => makeAsString(obj));
        return (stack: PersistentStack<number>): void => {
          allAsStrings.
            map((fn: (stack: PersistentStack<number>) => string) => fn(stack)).
            reverse().
            forEach(mPutsFn);
        };
    }

    function lookUpImpl
      (tbl: ImplementationTable, params: Readonly<ObjectType[]>): ImplementationTable
    {
      params.forEach((obj: ObjectType) => {
        tbl = (tbl[obj.uid()] ??= { implementation: undefined });
      });
      return tbl;
    }


    return freeze({
      byParameters(types: Readonly<ObjectType[]>): FunctionType | undefined {
        const table = lookUpImpl(mTable, types);
        return table.implementation ??= IncompleteFunctionType.
          make().
          setCallStrategy(CallHandlingStrategies.noReceiver).
          setBuiltin( makeImplementation(types) ).
          setParameters(types).
          setReturns([]).
          setName('puts').
          finish();
      }
    });
  }
});
