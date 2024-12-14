import { Helpers } from './helpers';
import { FunctionType } from './function_type';
import { ObjectType } from './object_type';

const { freeze } = Helpers;

type FunctionLookUpTableEntry = {
  implementation: FunctionType | undefined,
  [uid: symbol]: FunctionLookUpTableEntry | undefined
};

// function allTheSameReturns(
//   root: FunctionLookUpTableEntry): 'null' | symbol | undefined
// {
//   // and that's why I need all my tuple shit
//   let implType: 'null' | symbol | undefined = root.implementation?.returns();

//   Object.getOwnPropertySymbols(root).map((val: symbol) => {
//     implType ??= val;
//     return (implType === val) && allTheSameReturns(root) === val;
//   })
// }

// // function verifySameReturns() {

// // }

export const FunctionLookUpTable = freeze({
  make(mTable: FunctionLookUpTableEntry) {
    mTable
    return freeze({
      byParameters(types: Readonly<ObjectType[]>): FunctionType | undefined {
        let table: FunctionLookUpTableEntry | undefined = mTable;
        types.forEach((p: ObjectType) => {
          if (!table)
            { return; }
          table = table[p.uid()];
        });
        return table?.implementation;
      }
    });
  },
  makeSingleLookUp(mFuncType: FunctionType): FunctionLookUpTable {
    return freeze({
      byParameters(types: Readonly<ObjectType[]>): FunctionType | undefined {
        const params = mFuncType.parameters();
        if (types.length !== params.length)
          { return undefined; }
        let matches = true;
        for (let i = 0; i < types.length; ++i) {
          matches &&= types[i].uid() === params[i].uid();
        }
        if (matches)
          { return mFuncType; }
        return undefined;
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
          impl.parameters().forEach((param: ObjectType) => {
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
