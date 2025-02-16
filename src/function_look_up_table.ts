import { Helpers } from './helpers';
import { FunctionType } from './function_type';
import { ObjectType } from './object_type';

const { freeze } = Helpers;

type FunctionLookUpTableEntry = {
  implementation: FunctionType | undefined,
  [uid: symbol]: FunctionLookUpTableEntry | undefined
};

export interface FunctionLookUpTable {
  byParameters(type: ObjectType): FunctionType | undefined,
  // possibly and hopefully a hack
  // TODO find a better way to "sneak" methods
  oneTimeSetter(): FunctionType | undefined
};

export const FunctionLookUpTable = freeze({
  make(mTable: FunctionLookUpTableEntry) {
    return freeze({
      byParameters(type: ObjectType): FunctionType | undefined {
        let table: FunctionLookUpTableEntry | undefined = mTable;
        type.decompose().forEach((p: ObjectType) => {
          if (!table)
            { return; }
          table = table[p.uid()];
        });
        return table?.implementation;
      },
      oneTimeSetter: () => undefined
    });
  },
  makeSingleLookUp(mFuncType: FunctionType): FunctionLookUpTable {
    const params = mFuncType.parameters().decompose();
    return freeze({
      byParameters(type: ObjectType): FunctionType | undefined {
        const types = type.decompose();
        if (types.length !== params.length)
          { return undefined; }
        let matches = true;
        for (let i = 0; i < types.length; ++i) {
          matches &&= types[i].uid() === params[i].uid();
        }
        if (matches)
          { return mFuncType; }
        return undefined;
      },
      oneTimeSetter: () => undefined
    });
  }
});

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
          impl.parameters().decompose().forEach((param: ObjectType) => {
            table = table[param.uid()] ??= { implementation: undefined };
          });
          table.implementation ??= impl;
        });
        return FunctionLookUpTable.make(mTable);
      }
    });
    return inst;
  }
});
