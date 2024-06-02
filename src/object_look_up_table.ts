import { Helpers, PersistentStack } from './helpers';
import { ObjectType } from './object_type';
import { IncompleteFunctionType } from './function_type';
import { ContextVariable } from './context_variable';

const { freeze, memoize } = Helpers;

export interface ObjectLookUpTable {
  addBuiltinTypes: () => ObjectLookUpTable,
  lookUpByType: (typeUid: symbol) => ObjectType
}

export const ObjectLookUpTable = (() => {
  const getBuiltinTypes = memoize(() => {
    const integer_ = ObjectType.make('Integer');
    const string_ = ObjectType.make('String');

    const add = IncompleteFunctionType.
      make().
      setName('+').
      setArguments(integer_.asSingluarParameter()).
      setReturns  ([ integer_ ]).
      setBuiltin((stack: PersistentStack<ContextVariable>,
                  lhs: ContextVariable,
                  rhs: ContextVariable) =>
        {
          const res = lhs.asNumber() + rhs.asNumber();
          stack.push().set(res);
        }).
      finish();

    const sub = IncompleteFunctionType.
      make().
      setName('-').
      setArguments(integer_.asSingluarParameter()).
      setReturns  ([ integer_ ]).
      setBuiltin((stack: PersistentStack<ContextVariable>,
                  lhs: ContextVariable,
                  rhs: ContextVariable) =>
        {
          const res = lhs.asNumber() - rhs.asNumber();
          stack.push().set(res);
        }).
      finish();

    const assign = IncompleteFunctionType.
      make().
      setName(':=').
      setArguments(integer_.asSingluarParameter()).
      setReturns  ([ integer_ ]).
      setBuiltin((stack: PersistentStack<ContextVariable>,
                  lhs: ContextVariable,
                  rhs: ContextVariable) =>
        {
          rhs.copyTo(lhs);
          lhs.copyTo( stack.push() );
        }).
      finish();

    const toS = IncompleteFunctionType.
      make().
      setName('toString').
      setArguments([]).
      setReturns  ([ string_ ]).
      finish();

    const assignStr = IncompleteFunctionType.
      make().
      setName(':=').
      setArguments(string_.asSingluarParameter()).
      setReturns  ([ string_ ]).
      setBuiltin((stack: PersistentStack<ContextVariable>,
                  lhs: ContextVariable,
                  rhs: ContextVariable) =>
        {
          rhs.copyTo(lhs);
          lhs.copyTo( stack.push() );
        }).
      finish();

    return freeze({
      Integer: integer_.
        setLookUp({
          ['+' ]: add,
          ['-' ]: sub,
          [':=']: assign,
          ['toString']: toS
        }),
      String: string_.
        setLookUp({
          [':=']: assignStr
        }),
      Unresolved: ObjectType.make('Unresolved')
    });
  });

  function make(): ObjectLookUpTable {
    const inst = freeze({ addBuiltinTypes, lookUpByType });
    const mLookUpByUid: { [uid: symbol]: ObjectType } = {};
    const mLookUpByName: { [name: string]: ObjectType } = {};

    function addBuiltinTypes(): ObjectLookUpTable {
      [getBuiltinTypes().Integer, getBuiltinTypes().String].forEach((objType: ObjectType) => {
        mLookUpByName[objType.name()] = objType;
        mLookUpByUid[objType.uid] = objType;
      });
      return inst;
    }

    function lookUpByType(typeUid: symbol): ObjectType {
      return mLookUpByUid[typeUid];
    }

    return inst;
  }

  return freeze({ make, getBuiltinTypes });
})();
