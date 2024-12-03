import { Helpers } from './helpers';
import { ObjectType } from './object_type';
import { IncompleteFunctionType } from './function_type';
import { ContextVariable } from './context_variable';
import { PersistentStack } from './persistent_stack';
import { ObjectTypeResolution } from './object_type_resolution';
import { StandardErrorMessage } from './helpers';

const { freeze, memoize } = Helpers;

export interface ObjectLookUpTable {
  addBuiltinTypes: () => ObjectLookUpTable,
  lookUpByType: (typeUid: symbol) => ObjectTypeResolution,
  lookUpByName: (name: string) => ObjectTypeResolution,
  lookUpTuple: (objectTypes: ObjectType[]) => ObjectType
}

const makeContextType = (string_: ObjectType) => {
  const objType = ObjectType.make('Context');

  const askString = IncompleteFunctionType.
    make().
    noReceiver().
    setName('askString').
    setArguments([]).
    setReturns([ string_.uid ]).
    setBuiltin((stack: PersistentStack<ContextVariable>) => {
      stack.push().set('bees');
    }).
    finish();

  const puts = IncompleteFunctionType.
    make().
    noReceiver().
    setName('puts').
    setArguments(string_.decomposeAsArguments()).
    setReturns([]).
    setBuiltin((stack: PersistentStack<ContextVariable>) => {
      console.log(stack.pop().asString());
    }).
    finish();
  return objType.setLookUp({
    puts,
    askString
  });
};

export const ObjectLookUpTable = (() => {
  const getBuiltinTypes = memoize(() => {
    const integer_  = ObjectType.make('Integer' );
    const string_   = ObjectType.make('String'  );
    const function_ = ObjectType.make('Function');
    const context   = makeContextType(string_);

    const add = IncompleteFunctionType.
      make().
      setName('+').
      setArguments(integer_.decomposeAsArguments()).
      setReturns  ([ integer_.uid ]).
      setBuiltin((stack: PersistentStack<ContextVariable>) =>
        {
          const lhs = stack.pop();
          const rhs = stack.pop();
          
          stack.push().set(rhs.asNumber() + lhs.asNumber());
        }).
      finish();

    const sub = IncompleteFunctionType.
      make().
      setName('-').
      setArguments(integer_.decomposeAsArguments()).
      setReturns  ([ integer_.uid ]).
      setBuiltin((stack: PersistentStack<ContextVariable>) =>
        {
          const lhs = stack.pop();
          const rhs = stack.pop();
          
          stack.push().set(rhs.asNumber() - lhs.asNumber());
        }).
      finish();

    const mul = IncompleteFunctionType.
      make().
      setName('*').
      setArguments(integer_.decomposeAsArguments()).
      setReturns  ([ integer_.uid ]).
      setBuiltin((stack: PersistentStack<ContextVariable>) =>
        {
          const lhs = stack.pop();
          const rhs = stack.pop();
          stack.push().set(rhs.asNumber()*lhs.asNumber());
        }).
      finish();

    const assign = IncompleteFunctionType.
      make().
      setName(':=').
      setArguments(integer_.decomposeAsArguments()).
      setReturns  ([ integer_.uid ]).
      setBuiltin((stack: PersistentStack<ContextVariable>) =>
        {
          const lhs = stack.pop();
          const rhs = stack.pop();
          lhs.copyTo(rhs);
          rhs.copyTo( stack.push() );
        }).
      finish();

    const toS = IncompleteFunctionType.
      make().
      setName('toString').
      setArguments([]).
      setReturns  ([ string_.uid ]).
      finish();

    const assignStr = IncompleteFunctionType.
      make().
      setName(':=').
      setArguments(string_.decomposeAsArguments()).
      setReturns  ([ string_.uid ]).
      setBuiltin((stack: PersistentStack<ContextVariable>) =>
        {
          const lhs = stack.pop();
          const rhs = stack.pop();
          
          lhs.copyTo(rhs);
          rhs.copyTo( stack.push() );
        }).
      finish();

    const assignFn = IncompleteFunctionType.
      make().
      setName(':=').
      setArguments(function_.decomposeAsArguments()).
      setReturns  ([ function_.uid ]).
      setBuiltin((stack: PersistentStack<ContextVariable>) =>
      {
        const lhs = stack.pop();
        const rhs = stack.pop();
        
        lhs.copyTo(rhs);
        rhs.copyTo( stack.push() );
      }).
      finish();

    return freeze({
      Integer: integer_.
        setLookUp({
          ['*' ]: mul,
          ['+' ]: add,
          ['-' ]: sub,
          [':=']: assign,
          ['toString']: toS
        }),
      String: string_.
        setLookUp({
          [':=']: assignStr
        }),
      Function: function_.
        setLookUp({
          [':=']: assignFn
        }),
      Context: context,
      Unresolved: ObjectType.make('Unresolved')
    });
  });

  function make(): ObjectLookUpTable {
    const mLookUpByUid: { [uid: symbol]: ObjectTypeResolution | undefined } = {};
    const mLookUpByName: { [name: string]: ObjectTypeResolution | undefined } = {};

    function addBuiltinTypes(): ObjectLookUpTable {
      [
        getBuiltinTypes().Integer,
        getBuiltinTypes().String ,
        getBuiltinTypes().Function
      ].
      forEach((objType: ObjectType) => {
        const res = ObjectTypeResolution.makeFixedForType(objType);
        mLookUpByName[objType.name()] = res;
        mLookUpByUid [objType.uid   ] = res;
      });
      return inst;
    }

    const lookUpTuple = (() => {
      type TupleLookUpTableEntry = {
        object: ObjectType,
        [uid: symbol]: TupleLookUpTableEntry | undefined
      };

      const mTable: TupleLookUpTableEntry = { object: ObjectType.make('Tuple()') };
  
      return (types: ObjectType[]): ObjectType => {
        if (types.length === 1) {
          return types[0];
        }
        // doesn't work for tuples with more than one member
        let seekingOn = mTable;
        let tupleName = 'Tuple(';
        types.forEach((type: ObjectType) => {
          const uids = () => types.map((type: ObjectType) => type.uid);
          tupleName += type.name();
          seekingOn = seekingOn[type.uid] ??= { object: ObjectType.makeForTuple(uids(), `${tupleName})`) };
          tupleName += ', ';
        });
        return seekingOn.object;
      };
    })();

    function lookUpByName(name: string): ObjectTypeResolution {
      const res = mLookUpByName[name];
      if (res)
        { return res; }
      return freeze({
        resolve: () => undefined,
        error: memoize((): StandardErrorMessage => freeze({
          message: `Cannot find type by name "${name}"`
        }))
      });
    }

    function lookUpByType(typeUid: symbol): ObjectTypeResolution {
      const res = mLookUpByUid[typeUid];
      if (res)
        { return res; }
      return freeze({
        resolve: () => undefined,
        error: memoize((): StandardErrorMessage => freeze({
          message: 'Cannot find type by given type uid'
        }))
      });
    }
    const inst = freeze({
      addBuiltinTypes,
      lookUpByType,
      lookUpByName,
      lookUpTuple
    });
    return inst;
  }

  return freeze({ make, getBuiltinTypes });
})();
