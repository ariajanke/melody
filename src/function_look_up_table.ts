import { Helpers } from './helpers';
import { IncompleteFunctionType } from './function_type';
import { type PersistentStack } from './persistent_stack';
import { type ContextVariable } from './context_variable';
import { FunctionType } from './function_type';

const { freeze } = Helpers;

export const PutsFunctionLookUpTable = freeze({
  make: (mPutsFn: (s: string) => void): FunctionLookUpTable => {
    const mImplementations: FunctionType[] = [];

    return freeze({
      byArguments(args: Readonly<symbol[]>): FunctionType | undefined {
        mImplementations.length = args.length;
        return mImplementations[args.length - 1] ??=
          IncompleteFunctionType.
            make().
            noReceiver().
            setBuiltin((stack: PersistentStack<ContextVariable>) => {
              // need a canonical order for arguments
              const strs: string[] = [];
              for (let i = 0; i < args.length; ++i) {
                 strs.push(stack.pop().asString());
              }
              strs.reverse().forEach(mPutsFn);
            }).
            setArguments(args).
            setReturns([]).
            setName('puts').
            finish();
      }
    });
  }
});

type FunctionLookUpTableEntry = {
  implementation: FunctionType | undefined,
  [uid: symbol]: FunctionLookUpTableEntry | undefined
};

export const FunctionLookUpTable = freeze({
  make(mTable: FunctionLookUpTableEntry) {
    return freeze({
      byArguments(uids: Readonly<symbol[]>): FunctionType | undefined {
        let table: FunctionLookUpTableEntry | undefined = mTable;
        uids.forEach((p: symbol) => {
          if (!table)
            { return; }
          table = table[p];
        });
        return table?.implementation;
      }
    });
  }
});
export type FunctionLookUpTable = ReturnType<typeof FunctionLookUpTable.make>;

export const IncompleteFunctionLookUpTable = freeze({
  make() {
    const mImplementations: FunctionType[] = [];
    const mTable: FunctionLookUpTableEntry = { implementation: undefined };
    const inst = freeze({
      push(ftype: FunctionType) {
        mImplementations.push(ftype);
        return inst;
      },
      finish() {
        mImplementations.forEach((impl: FunctionType) => {
          let table = mTable;
          impl.arguments_().forEach((param: symbol) => {
            table = table[param] ??= { implementation: undefined };
          });
          table.implementation ??= impl;
        });
        return FunctionLookUpTable.make(mTable);
      }
    });
    return inst;
  }
});
