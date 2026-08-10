import { ObjectType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { TupleObjectFactory } from '../tuple_type_factory';

const { freeze } = Helpers;

interface WritableVariableOffset {
  type: ObjectType;
  accessIndex: number;
};

export type VariableOffset = Readonly<WritableVariableOffset>;

export interface VariableAllocation {
  lookUp(name: string): VariableOffset | undefined;
  lookUpTuple(names: readonly string[]): VariableOffset | undefined;
  talliedSizeInBytes(): number;
  talliedSizeInItems(): number;
};

export interface ProgressiveVariableAllocation extends VariableAllocation {
  next(name: string, objectType: ObjectType):
    ProgressiveVariableAllocation;
};

const kJoinChar = ',';

function make
  (mNextName?: string,
   mNextObjectType?: ObjectType)
: ProgressiveVariableAllocation
{
  let mByteCount = 0;
  const mVarTable: { [name: string]: VariableOffset } = {};
  let mItemCount = 0;

  function next(name: string, objectType: ObjectType): ProgressiveVariableAllocation {
    if (mVarTable[name])
      { raise(`Name '${name}' already reserved.`); }
    if (name?.indexOf(kJoinChar) !== -1)
      { raise(`Name '${name}' may not contain '${kJoinChar}'`); }
    mVarTable[name] = freeze({
      accessIndex: mByteCount,
      type: objectType
    });
    mByteCount += objectType.sizeInBytes();
    mItemCount += objectType.sizeInStackItems();
    return inst;
  }

  function firstTimeLookUpTuple
    (names: Readonly<string[]>): VariableOffset | undefined
  {
    const lookUps = names.map(name => inst.lookUp(name));
    if (lookUps.some(value => value === undefined))
      { return undefined; }

    type TupleCheck = number | 'not ok' | 'started';
    const accessIndex = lookUps[0]!.accessIndex;
    const tupleOkay = lookUps.
      reduce((prevIdx: TupleCheck, lookUp: VariableOffset | undefined) => {
        if (prevIdx === 'not ok')
          { return prevIdx; }

        const size = lookUp!.type.sizeInBytes();
        const next = lookUp!.accessIndex + size;
        if (prevIdx === 'started') {
          return next;
        } else if ((next - prevIdx) === size) {
          return next;
        }
        return 'not ok';
      }, 'started' as TupleCheck);
    if (tupleOkay === 'not ok')
      { return undefined; }
    
    return freeze({
      accessIndex,
      type: TupleObjectFactory.make(lookUps.map(lookUp => lookUp!.type))
    });
  }

  function lookUpTuple
    (names: Readonly<string[]>): VariableOffset | undefined
  {
    if (names.length === 0) {
      raise('there must be at least one name in a valid tuple name set');
    }

    const joinedNames = names.join(kJoinChar);
    const found = mVarTable[joinedNames];
    if (found)
      { return found; }

    const rv = firstTimeLookUpTuple(names);
    if (rv)
      { mVarTable[joinedNames] = rv; }
    return rv;
  }
  
  const inst: ProgressiveVariableAllocation = freeze({
    lookUpTuple,
    lookUp(name: string): VariableOffset | undefined
      { return mVarTable[name]; },
    next,
    talliedSizeInBytes: (): number => mByteCount,
    talliedSizeInItems: (): number => mItemCount
  });

  if ((mNextName === undefined) !==
      (mNextObjectType === undefined))
  { raise('Either next name and next type are both defined or not'); }
  if (mNextName && mNextObjectType)
    { next(mNextName, mNextObjectType); }
  return inst;
}

export const VariableAllocation = freeze({ make });
