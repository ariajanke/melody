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
  next(name: string, objectType: ObjectType): VariableAllocation;
};

type VarAllocState = {
  mVarTable: { [name: string]: VariableOffset };
  mByteCount: number;
  mItemCount: number;
};

function make
  (mNextName?: string,
   mNextObjectType?: ObjectType,
   mPriv?: VarAllocState,
   mPrev?: VariableAllocation)
: VariableAllocation
{
  const kJoinChar = ',';

  if ((mNextName === undefined) !==
      (mNextObjectType === undefined))
  {
    raise('Either next name and next type are both defined or not');
  }
  
  function assertNextNameOk(name?: string) {
    if (name === undefined)
      { return; }
    if (mNextName?.indexOf(kJoinChar) === -1)
      { return; }
    raise(`Name '${name}' may not contain '${kJoinChar}'`);
  }
  assertNextNameOk(mNextName);
  
  const { mByteCount, mVarTable, mItemCount } =
    (mPriv ??= ({
      mByteCount: mNextObjectType?.sizeInBytes() ?? 0,
      mVarTable: {},
      mItemCount: mNextObjectType?.sizeInStackItems() ?? 0
    }));

  if (mNextName) {
    if (mVarTable[mNextName]) {
      raise(`Name '${mNextName}' already reserved.`);
    }
    mVarTable[mNextName] = freeze({
      accessIndex: mByteCount - mNextObjectType!.sizeInBytes(),
      type: mNextObjectType!
    });
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

        const size = lookUp!.type.sizeInStackItems();
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
  
  const inst: VariableAllocation = mPrev ?? freeze({
    lookUpTuple,
    lookUp(name: string): VariableOffset | undefined
      { return mVarTable[name]; },
    next(name: string, objectType: ObjectType): VariableAllocation {
      const rv = make(name, objectType, mPriv, inst);
      mPriv = undefined;
      return rv;
    },
    talliedSizeInBytes: (): number => mByteCount,
    talliedSizeInItems: (): number => mItemCount
  });
  return inst;
}

export const VariableAllocation = freeze({ make });
