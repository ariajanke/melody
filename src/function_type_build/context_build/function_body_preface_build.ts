import { FunctionLookUpTable, FunctionType, ObjectType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { CodeWriter } from '../../code_writer';
import { FunctionTypeBase } from '../function_type_base';
import { TupleObjectFactory } from '../tuple_type';
import { FunctionNamingSchema } from '../../function_naming_schema';
import {
  AncestorInfo,
  ExtendedAncestorInfo,
  UsedAncestorCollection
} from './used_ancestor_collection';
import { ContextAttributeFactory } from './context_attribute_factory';
import { MutableFunctionTable } from '../mutable_function_table';
import { TupleFunctionTypeBuild } from '../tuple_function_type_build';
import { VariableAllocation } from './variable_allocation';
import { FunctionOpLookUp } from './context_base_stage';

const { freeze, memoize } = Helpers;

export interface FunctionBodyPrefaceBuild {
  functionType(): FunctionType;
  addAncestorAccessors(): Readonly<FunctionType[]>;
};

function make
  (mVariableAllocation: VariableAllocation,
   mUsedAncestorCollection: UsedAncestorCollection,
   mCurrentContextReferenceType: ObjectType,
   mReferenceTypeLookUpTable: FunctionOpLookUp = {})
  : FunctionBodyPrefaceBuild
{
  const { hasParentGetter } = mUsedAncestorCollection;

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

  const parentAccessInfo = memoize(() =>
    mVariableAllocation.lookUp(FunctionNamingSchema.kParentName) ??
    raise('used ancestors is not consistent with variable allocations'));

  const parentGetter = memoize((): FunctionType | undefined => {
    if (!hasParentGetter())
      { return undefined; }

    const ftype = ContextAttributeFactory.
      buildReceiverGetter(parentAccessInfo().accessIndex, parentAccessInfo().type);
    checkedAddAccessor(FunctionNamingSchema.kParentName, ftype);

    return ftype;
  });

  const saveLocalStackPointer = memoize((): FunctionType =>
    freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      simpleEmit(writer: CodeWriter): void {
        writer.forStackPointer('saveToLocal');
        if (hasParentGetter()) {
          writer.storeParentPointer(parentAccessInfo().accessIndex);
        }
      }
    })
  );

  const ancestorAccessors = memoize((): Readonly<FunctionType[]> => {
    if (!parentGetter())
      { return []; }
    return mUsedAncestorCollection.ancestors().map((info: AncestorInfo) => {
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

  const ancestorTupleEmission = memoize((): FunctionType => {
    if (!parentGetter())
      { raise('need parent'); }
    const ancs = mUsedAncestorCollection.allAncestors();
    if (ancs.length === 0) {
      return freeze({
        ...FunctionTypeBase.makeNewEmitlessEmpty(),
        simpleEmit: (_0: CodeWriter) => {}
      });
    }
    // a_0 === parent, specifically parentGetter
    const hopEmissions = ancs.map(
      (info: ExtendedAncestorInfo) =>
      (writer: CodeWriter): void => {
        // to call this parent method, their receiver must be pushed
        // the magic is in setting SP
        // assume a_{n-1} (info.type's context pointer) is on top...
        writer.setStackPointer();

        // NOTE receiver resolution without the actual thing
        const recFtype = info.type.
          lookUp(FunctionNamingSchema.kContextName)?.
          byParameters(TupleObjectFactory.emptyTuple());

        info.type.
          lookUp(FunctionNamingSchema.kParentName)?.
          byParameters(TupleObjectFactory.emptyTuple())!.
          emit(recFtype!, FunctionTypeBase.emitEmptyTuple(), writer);

        if (info.use === 'used') {
          writer.duplicateTop();
        }
      }
    );
    
    const ftype = freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      simpleEmit(writer: CodeWriter): void {
        parentGetter()!.simpleEmit(writer);
        hopEmissions.forEach(emitHop => emitHop(writer));
        writer.forStackPointer('restoreToGlobal');
      },
      returns: mUsedAncestorCollection.ancestorTupleType
    });
    
    return ftype;
  });

  const ancestorInitialSet = memoize((): FunctionType => {
    if (!parentGetter())
      { raise('need parent'); }

    const ancestorTupleName = mUsedAncestorCollection.ancestors().
      map(value => value.variableName)
    const varInfo = mVariableAllocation.lookUpTuple(ancestorTupleName);
    if (!varInfo) {
      raise('ancestors must be allocated in order');
    }

    const setter = ContextAttributeFactory.
      buildInitialSetter(varInfo.accessIndex, varInfo.type);
    const getContext = mCurrentContextReferenceType.
      lookUp(FunctionNamingSchema.kContextName)!.
      byParameters(TupleObjectFactory.emptyTuple());
    return freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      simpleEmit(writer: CodeWriter) {
        setter.emit(getContext!, ancestorTupleEmission(), writer);
      }
    });
  });

  const preface = memoize((): FunctionType => freeze({
    ...FunctionTypeBase.makeNewEmitlessEmpty(),
    simpleEmit(writer: CodeWriter) {
      // save your parent WASM param
      saveLocalStackPointer().simpleEmit(writer);
      // set your ancestors
      if (hasParentGetter()) {
        ancestorInitialSet().simpleEmit(writer);
      }
    },
  }));

  const inst = freeze({
    functionType: preface,
    addAncestorAccessors: ancestorAccessors
  });
  return inst;
}

export const FunctionBodyPrefaceBuild = freeze({ make });
