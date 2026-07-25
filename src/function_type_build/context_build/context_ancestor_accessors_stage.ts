import { FunctionNamingSchema } from '../../function_naming_schema';
import { FunctionType, ObjectType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { MutableFunctionTable } from '../mutable_function_table';
import { TupleObjectFactory } from '../tuple_type_factory';
import { ContextAttributeFactory } from './context_attribute_factory';
import { FunctionOpLookUp } from './context_base_stage';
import { AncestorInfo, UsedAncestorCollection } from './used_ancestor_collection';
import { VariableAllocation, VariableOffset } from './variable_allocation';

const { freeze, memoize } = Helpers;

export interface ContextAncestorAccessorsStage {
  // NOTE not undefined -> not an error
  parentGetter(): FunctionType | 'none';
  parentAccessInfo(): VariableOffset | 'none';

  referenceType(): ObjectType;
};

function make
  (mVariableAllocation: VariableAllocation,
   mUsedAncestorCollection: UsedAncestorCollection,
   mCurrentContextReferenceType: ObjectType,
   mReferenceTypeLookUpTable: FunctionOpLookUp = {})
  : ContextAncestorAccessorsStage
{
  const { hasParentGetter } = mUsedAncestorCollection;
  const { kParentName } = FunctionNamingSchema;

  function checkedAddAccessor
    (op: string | symbol, ftype: FunctionType): FunctionType
  {
    if (ftype.receiver().uid() !== TupleObjectFactory.emptyTuple().uid()) {
      raise('uh oh, must not require a receiver');
    }
    if (mReferenceTypeLookUpTable[op]) {
      raise(`Already used '${String(op)}'`);
    }
    mReferenceTypeLookUpTable[op] = MutableFunctionTable.
      make().
      setDefinition(ftype.parameters(), ftype);
    return ftype;
  }

  const parentGetter_ = memoize((): FunctionType | 'none' => {
    if (!hasParentGetter())
      { return 'none'; }

    const pInfo = parentAccessInfo_();
    if (pInfo === 'none')
      { raise('bad info'); }

    const ftype = ContextAttributeFactory.
      buildReceiverGetter(pInfo.accessIndex, pInfo.type);
    checkedAddAccessor(kParentName, ftype);

    return ftype;
  });

  const parentAccessInfo_ = memoize(() => {
    if (!hasParentGetter())
      { return 'none'; }

    return mVariableAllocation.lookUp(kParentName) ??
           raise('used ancestors is not consistent with variable allocations');
  });

  const ancestorAccessors = memoize((): Readonly<FunctionType[]> => {
    if (parentGetter_() === 'none')
      { return []; }

    return mUsedAncestorCollection.
      ancestors().
      map((info: AncestorInfo) => {
        const varInfo = mVariableAllocation.lookUp(info.variableName);
        if (!varInfo) {
          raise(`Excepted variable '${info.variableName}' to be defined`);
        }

        const accessorName = FunctionNamingSchema.
          mapToFringeAccessor(info.variableName);
        const ftype = ContextAttributeFactory.
          buildReceiverGetter(varInfo.accessIndex, varInfo.type);
        return checkedAddAccessor(accessorName, ftype);
      });
  });

  function endMemoize<T>(fn: () => T): () => T {
    return memoize(() => {
      ancestorAccessors();
      return fn();
    });
  }

  const parentGetter = endMemoize(parentGetter_);

  const parentAccessInfo = endMemoize(parentAccessInfo_);

  const referenceType = endMemoize(() => mCurrentContextReferenceType);

  return freeze({ referenceType, parentGetter, parentAccessInfo });
}

export const ContextAncestorAccessorsStage = freeze({ make });
