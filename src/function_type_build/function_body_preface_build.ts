import { FunctionLookUpTable, FunctionType, MutableObjectType, ObjectType } from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { CodeWriter } from '../code_writer';
import { FunctionTypeBase } from './function_type_base';
import { TupleObjectFactory } from './tuple_type';
import { FunctionNamingSchema } from '../function_naming_schema';
import { StackSafetyChecker } from './stack_safety_checker';
import {
  AncestorInfo,
  ExtendedAncestorInfo,
  UsedAncestorCollection
} from './used_ancestor_collection';
import { ContextFactoryStage } from './context_factory_stage';
import { VariableAllocation } from './ncontext_build';
import { ContextAttributeFactory } from './context_attribute_factory';
import { MutableFunctionTable } from './mutable_function_table';
import { TupleFunctionTypeBuild } from './tuple_function_type_build';

const { freeze, memoize } = Helpers;

export interface FunctionBodyPrefaceBuild {
  functionType(): FunctionType;
  addAncestorAccessors(): Readonly<FunctionType[]>;
};

type FunctionOpLookUp =
  { [op: string | symbol]: FunctionLookUpTable | undefined };

// I guess we're building and binding ftypes to the context?!
// may as well include the parent?
function make
  (//mStage: ContextFactoryStage,
  //  mPrototypeContext: MutableObjectType,
  //  mFunctionLookUp: FunctionOpLookUp,
   mVariableAllocation: VariableAllocation,
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

  const parentGetter = memoize((): FunctionType | undefined => {
    if (!hasParentGetter())
      { return undefined; }

    // have to make accessors from our variable allocation
    const varInfo = 
      mVariableAllocation.lookUp(FunctionNamingSchema.kParentName) ??
      raise('used ancestors is not consistent with variable allocations');
    
    const ftype = ContextAttributeFactory.
      buildReceiverGetter(varInfo.accessIndex, varInfo.type);
    checkedAddAccessor(FunctionNamingSchema.kParentName, ftype);
    return ftype;
    // return mStage.intoObjectType().
    //   lookUp(FunctionNamingSchema.kParentName)?.
    //   byParameters(TupleObjectFactory.emptyTuple());
  });

  const saveLocalStackPointer = memoize((): FunctionType =>
    freeze({
      // ...FunctionTypeBase.receivedByContext(),
      ...FunctionTypeBase.makeDefaults(),
      simpleEmit(writer: CodeWriter): void {
        writer.forStackPointer('saveToLocal');
        if (hasParentGetter()) {
          writer.storeParentStackPointer();
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
      //   mapToFringeAccessor(info.variableName);
        mapToFringeAccessor(info.variableName);

      const ftype = ContextAttributeFactory.
        buildReceiverGetter(varInfo.accessIndex, varInfo.type);
      return checkedAddAccessor(accessorName, ftype);
      // const build = mStage.
      //   intoAccessorBuild(accessorName, info, info.type);
      // if (!build.functionType()) {
      //   raise(
      //     `Ancestor accessor "${accessorName}" failed to build: ` +
      //     `"${build.error().message}"`
      //   );
      // }
      // return build.functionType()!;
    });
  });

  const ancestorTupleEmission = memoize((): FunctionType => {
    if (!parentGetter())
      { raise('need parent'); }
    const ancs = mUsedAncestorCollection.allAncestors();
    if (ancs.length === 0) {
      return freeze({
        // ...FunctionTypeBase.receivedByContext(),
        ...FunctionTypeBase.makeDefaults(),
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

        const recFtype = info.type.
          lookUp(FunctionNamingSchema.kContextName)?.
          byParameters(TupleObjectFactory.emptyTuple());

        info.type.
          lookUp(FunctionNamingSchema.kParentName)?.
          byParameters(TupleObjectFactory.emptyTuple())!.
          emit(recFtype!, TupleFunctionTypeBuild.emitEmpty(), writer);

        if (info.use === 'used') {
          writer.duplicateTop();
        }
      }
    );
    // StackSafetyChecker.make().check(parentGetter()!);
    const ftype = freeze({
      ...FunctionTypeBase.makeDefaults(),
      simpleEmit(writer: CodeWriter): void {
        parentGetter()!.simpleEmit(writer);
        hopEmissions.forEach(emitHop => emitHop(writer));
        writer.forStackPointer('restoreToGlobal');
      },
      returns: mUsedAncestorCollection.ancestorTupleType
    });
    // StackSafetyChecker.make().check(ftype);
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
      buildSetter(varInfo.accessIndex, varInfo.type);
    const getContext = mCurrentContextReferenceType.
      lookUp(FunctionNamingSchema.kContextName)!.
      byParameters(TupleObjectFactory.emptyTuple());
    return freeze({
      ...FunctionTypeBase.makeDefaults(),
      simpleEmit(writer: CodeWriter) {
        setter.emit(getContext!, ancestorTupleEmission(), writer);
      }
    });
  });

  const preface = memoize((): FunctionType => freeze({
    ...FunctionTypeBase.makeDefaults(),
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
    // memoize((): FunctionType => {
    //   // ensure ancestor accessors are built first
    //   ancestorAccessors();
    //   return freeze({
    //     ...FunctionTypeBase.makeDefaults(),
    //     simpleEmit(writer: CodeWriter) {
    //       saveLocalStackPointer().emit(writer);
    //       if (hasParentGetter()) {
    //         ancestorInitialSet().simpleEmit(writer);
    //       }
    //       return writer;
    //     }
    //   });
    // })
  });
  return inst;
}

export const FunctionBodyPrefaceBuild = freeze({ make });
