import { ObjectType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { TupleObjectFactory } from '../tuple_type';

const { freeze } = Helpers;

interface WritableVariableOffset {
  type: ObjectType;
  accessIndex: number;
};

type VariableOffset = Readonly<WritableVariableOffset>;

export interface VariableAllocation {
  lookUp(name: string): VariableOffset | undefined;
  lookUpTuple(names: readonly string[]): VariableOffset | undefined;
  next(name: string, objectType: ObjectType): VariableAllocation;
  talliedSizeInBytes(): number;
  talliedSizeInItems(): number;
};

type VarAllocState = {
  mVarTable: { [name: string]: VariableOffset };
  mByteCount: number;
  mItemCount: number;
};

export const VariableAllocation = freeze({
  make(mNextName?: string,
       mNextObjectType?: ObjectType,
       mPriv?: VarAllocState,
       mPrev?: VariableAllocation)
    : VariableAllocation
  {
    if ((mNextName === undefined) !==
        (mNextObjectType === undefined))
    {
      raise('Either next name and next type are both defined or not');
    }
    const kJoinChar = ',';
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
    
    const inst: VariableAllocation = mPrev ?? freeze({
      lookUpTuple(names: readonly string[]): VariableOffset | undefined {
        if (names.length === 0) {
          raise('there must be at least one name in a valid tuple name set');
        }
        const joinedNames = names.join(',');
        const found = mVarTable[joinedNames];
        if (found)
          { return found; }
        const lookUps = names.map(name => inst.lookUp(name));
        if (lookUps.some(value => value === undefined))
          { return undefined; }
        type TupleCheck = number | 'not ok' | 'started';
        const accessIndex = lookUps[0]!.accessIndex;
        const tupleOkay = lookUps.reduce((prevIdx: TupleCheck, lookUp: VariableOffset | undefined) => {
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
        if (!tupleOkay)
          { return undefined; }
        const rv = freeze({
          accessIndex,
          type: TupleObjectFactory.make(lookUps.map(lookUp => lookUp!.type))
        });
        mVarTable[joinedNames] = rv;
        return rv;
      },
      lookUp(name: string): VariableOffset | undefined
        { return mVarTable[name]; },
      next(name: string, objectType: ObjectType): VariableAllocation {
        const rv = VariableAllocation.make(name, objectType, mPriv, inst);
        mPriv = undefined;
        return rv;
      },
      talliedSizeInBytes: (): number => mByteCount,
      talliedSizeInItems: (): number => mItemCount
    });
    return inst;
  }
});
