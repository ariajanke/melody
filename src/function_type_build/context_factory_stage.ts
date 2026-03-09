import { CodeWriter } from '../code_writer';
import { ContextTypeReservations } from '../context_type_reservations';
import { DastAttributeDeclaration } from '../dast_build';
import { FunctionNamingSchema } from '../function_naming_schema';
import { FunctionLookUpTable, FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { MemoryArray } from '../memory_array';
import { Token } from '../token';
import { BuiltinTypeBase } from './builtin_type';
import { ContextAccessorBuild } from './context_accessor_build';
import { ContextAttributeFactory } from './context_attribute_factory';
import { ContextInitialSetBuild } from './context_initial_set_build';
import { ContextModifierBuild } from './context_modifier_build';
import { FunctionTypeBase } from './function_type_base';
import { MutableFunctionTable } from './mutable_function_table';
import { TupleObjectFactory } from './tuple_type';
import { VariableTracker } from './variable_tracker';

const { freeze, memoize } = Helpers;

// ok rule here: keep DAST nodes OUT of this abstraction
export interface ContextObjectType extends ObjectType {
  intoFactoryStage(): ContextFactoryStage;
};

export interface ContextFunctionTypeBuild extends FunctionTypeBuild {
  intoFactoryStage(): ContextFactoryStage;
};

export interface ContextFactoryStage {
  intoParentBuild(frameName: string, parentType: ObjectType): ContextFactoryStage;
  intoModifierBuild
    (name: string, attr: DastAttributeDeclaration, basedOn: ObjectType)
    : ContextFunctionTypeBuild;
  intoAccessorBuild
    (name: string, attr: DastAttributeDeclaration, basedOn: ObjectType)
    : ContextFunctionTypeBuild;
  intoInitialSetBuild
    (name: string, variableNames: Readonly<string[]>, basedOn: ObjectType)
    : ContextFunctionTypeBuild;
  intoDirectLookUp(name: string, lookUpTable: FunctionLookUpTable)
    : ContextFactoryStage;
  intoObjectType(): ContextObjectType;
};

export type FunctionOpLookUp =
  { [op: string | symbol]: FunctionLookUpTable | undefined };

// I need a place to build the actual context type
// it needs the ability to reference itself
const BlankContextType = freeze({
  make(mVariableTracker: VariableTracker,
       mTable: FunctionOpLookUp)
    : ObjectType
  {
    const referenceType = memoize((): ObjectType => {
      const refType = freeze({
        ...BuiltinTypeBase.defaultsWith((): ObjectType => refType),
        name: () => `Reference(${Token.kContextToken.content()})`,
        lookUp(operation: string | symbol): FunctionLookUpTable | undefined
          { return inst.lookUp(operation); },
        sizeInBytes: () => MemoryArray.kWordSizeInBytes,
        sizeInStackItems: () => 1,
      });
      return refType;
    });

    const referenceGetter = memoize((): FunctionType => freeze({
      ...FunctionTypeBase.receivedByNone(),
      returns: () => referenceType(),
      emit(codeWriter: CodeWriter) {
        return codeWriter.pushStackPointer();
      }
    }));

    const noneGetter = memoize((): FunctionType => freeze({
      ...FunctionTypeBase.receivedByNone(),
      emit(_0: CodeWriter) {}
    }));

    const { emptyTuple } = TupleObjectFactory;

    const addContext = (() =>
      mTable[FunctionNamingSchema.kContextName] = MutableFunctionTable.
        make().setDefinition(emptyTuple(), referenceGetter()));

    const addNone = (() =>
      mTable[FunctionNamingSchema.kNoneName] = MutableFunctionTable.
        make().setDefinition(emptyTuple(), noneGetter()));

    const { talliedSizeInBytes, talliedSizeInItems } = mVariableTracker;

    // return the "full" type
    // you can look up the reference type, by:
    // inst.lookUp(FunctionNamingSchema.kContextName)?.byParameters(TupleObjectFactory.emptyTuple()).returns();

    const inst = freeze({
      ...BuiltinTypeBase.defaultsWith((): ObjectType => inst),
      name: Token.kContextToken.content,
      lookUp(operation: string | symbol): FunctionLookUpTable | undefined
        { return mTable[operation]; },
      sizeInBytes: () => talliedSizeInBytes(),
      sizeInStackItems: () => talliedSizeInItems()
    });

    return addContext() && addNone() && inst;
  }
});

function make
  (mVariableTracker = VariableTracker.make(),
   mTable: FunctionOpLookUp = {})
  : ContextFactoryStage
{
  // try and hide our "dirty laundry" here, we'll pass inst into constructors

  // this declare "<parent>"
  // there's a difference between this and another context attr
  function intoParentBuild
    (frameName: string, parentType: ObjectType): ContextFactoryStage
  {
    const parentRefType = parentType.
      lookUp(FunctionNamingSchema.kContextName)?.
      byParameters(TupleObjectFactory.emptyTuple())?.
      returns();
    if (!parentRefType) {
      raise(`Cannot find context getter on parent type "${parentType.name()}"`);
    }
    // the variable tracker gets bumped just fine
    // but it maybe out of sync with the actual attribute functions
    // so "uh oh" to that
    mVariableTracker.
      ensureVariablePresence(FunctionNamingSchema.kParentName, parentRefType);
    const parentAccessFunc = ContextAttributeFactory.buildGetter(
      ContextTypeReservations.kParentAccessIndex,
      parentRefType);
    const ftable = MutableFunctionTable.
      make().
      setDefinition(TupleObjectFactory.emptyTuple(), parentAccessFunc);
    mTable[frameName] = mTable[FunctionNamingSchema.kParentName] = ftable;
    return inst;
  }

  function intoAccessorBuild
    (name: string, attr: DastAttributeDeclaration, basedOn: ObjectType)
    : ContextFunctionTypeBuild
  {
    return ContextAccessorBuild.make(name, attr, basedOn, mVariableTracker, mTable);
  }

  function intoModifierBuild
    (name: string, attr: DastAttributeDeclaration, basedOn: ObjectType)
    : ContextFunctionTypeBuild
  {
    // ffffuuuuu
    const accessorBuild = ContextAccessorBuild.make(
      FunctionNamingSchema.mapToFringeAccessor(attr.variableName),
      attr,
      basedOn,
      mVariableTracker,
      mTable
    );
    if (!accessorBuild.functionType()) {
      return accessorBuild;
    }

    return ContextModifierBuild.make(name, attr, basedOn, mVariableTracker, mTable);
  }

  function intoInitialSetBuild
    (name: string, variableNames: Readonly<string[]>, basedOn: ObjectType)
    : ContextFunctionTypeBuild
  {
    return ContextInitialSetBuild.make(name, variableNames, basedOn, mVariableTracker, mTable);
  }

  function intoDirectLookUp(name: string, lookUpTable: FunctionLookUpTable)
    : ContextFactoryStage
  {
    mTable[name] = lookUpTable;
    return inst;
  }

  const intoObjectType = memoize((): ContextObjectType => freeze({
    // this will declare "<context>", and "<none>"
    ...BlankContextType.make(mVariableTracker, mTable),
    intoFactoryStage: () => inst
  }));

  const inst = freeze({
    intoAccessorBuild,
    intoModifierBuild,
    intoInitialSetBuild,
    intoDirectLookUp,
    intoObjectType,
    intoParentBuild
   });

  return inst;
}

export const ContextFactoryStage = freeze({ make });

// --- OLD ---
// const kStuff = false;
// if (kStuff) {
// interface ContextTypeBuilder {
//   addModifier(name: string, attr: DastAttributeDeclaration, basedOn: ObjectType): FunctionTypeBuild;
//   addAccessor(name: string, attr: DastAttributeDeclaration, basedOn: ObjectType): FunctionTypeBuild;
//   addInitialSet(name: string, variableNames: Readonly<string[]>, basedOn: ObjectType)
//     : FunctionTypeBuild;
//   addDirectLookUp(name: string, lookUpTable: FunctionLookUpTable): ContextTypeBuilder;
//   objectType(): ObjectType;
// };

// function make(): ContextTypeBuilder {
//   const mVariableTracker = VariableTracker.make();

//   const mLookUpTable:
//     { [op: string | symbol]: FunctionLookUpTable | undefined } = {};

//   const { emptyTuple } = TupleObjectFactory;

//   function addAccessor
//     (name: string, attr: DastAttributeDeclaration, basedOn: ObjectType): FunctionTypeBuild
//   {
//     if (!FunctionNamingSchema.isAFringeAccessorName(name)) {
//       throw new Error(`Expected an accessor name, got "${name}"`);
//     }
    
//     const fbuild = ContextAccessorBuild.make(attr, basedOn, mVariableTracker);
//     const { functionType } = fbuild;
//     if (functionType()) {  
//       mLookUpTable[name] = MutableFunctionTable.
//         make().
//         setDefinition(emptyTuple(), functionType()!);
//     }
//     return fbuild;
//   }

//   function addModifier
//     (name: string, attr: DastAttributeDeclaration, basedOn: ObjectType): FunctionTypeBuild
//   {
//     if (!FunctionNamingSchema.isAnAssignmentName(name)) {
//       throw new Error(`Expected a modifier name, got "${name}"`);
//     }
//     const accName = FunctionNamingSchema.mapToFringeAccessor(attr.variableName);
//     const accBuild = addAccessor(accName, attr, basedOn);
//     if (!accBuild.functionType()) {
//       return accBuild;
//     }
//     const fbuild = ContextModifierBuild.make(attr, basedOn, mVariableTracker, objectType());
//     const { functionType } = fbuild;
//     if (functionType()) {
//       mLookUpTable[name] = MutableFunctionTable.
//         make().
//         setDefinition(functionType()!.parameters(), functionType()!);
//     }
//     return fbuild;
//   }

//   function addInitialSet
//     (name: string, brokenInto: Readonly<string[]>, definedBy: ObjectType)
//     : FunctionTypeBuild
//   {
//     if (!FunctionNamingSchema.isAnInitialSetName(name)) {
//       throw new Error(`Expected an initial set name, got "${name}"`);
//     }
//     const creation = InitialSetImplementation.
//       make(brokenInto, definedBy, mVariableTracker);
//     const ftype = creation.functionType();
//     if (ftype) {
//       mLookUpTable[name] = MutableFunctionTable.
//         make().
//         setDefinition(definedBy, ftype);
//     }
//     return creation;
//   }

//   const referenceType = memoize((): ObjectType => {
//     const inst = freeze({
//       ...BuiltinTypeBase.defaultsWith((): ObjectType => inst),
//       name: () => `Reference(${Token.kContextToken.content()})`,
//       lookUp(operation: string | symbol): FunctionLookUpTable | undefined
//         { return objectType().lookUp(operation); },
//       sizeInBytes: () => MemoryArray.kWordSizeInBytes,
//       sizeInStackItems: () => 1,
//     });
//     return inst;
//   });

//   const referenceGetter = memoize((): FunctionType => {
//     const ftype = freeze({
//       parameters: () => TupleObjectFactory.emptyTuple(),
//       returns: () => referenceType(),
//       emit(codeWriter: CodeWriter) {
//         // as in preface a call...
//         return codeWriter.pushStackPointer();
//       },
//       uid: memoize(Symbol)
//     });
//     return ftype;
//   });

//   const addContext = memoize(() => {
//     mLookUpTable[FunctionNamingSchema.kContextName] = {
//       byParameters(type: ObjectType) {
//         if (type.uid() === TupleObjectFactory.emptyTuple().uid()) {
//           return referenceGetter();
//         }
//         return undefined;
//       }
//     };
//   });

//   // const parentGetter = memoize((): FunctionType => {
//   //   const ftype = freeze({
//   //     parameters: () => TupleObjectFactory.emptyTuple(),
//   //     returns: () => 'idk lol',
//   //     emit(codeWriter: CodeWriter) {
//   //       codeWriter.loadInteger(ContextTypeReservations.kParentAccessIndex);
//   //       return codeWriter;
//   //     },
//   //     uid: memoize(Symbol)
//   //   });
//   //   return ftype;
//   // });

//   // const addParent = memoize(() => {
//   //   mLookUpTable[FunctionNamingSchema.kParentName] = {
//   //     byParameters(type: ObjectType) {
//   //       if (type.uid() === TupleObjectFactory.emptyTuple().uid()) {
//   //         return parentGetter();
//   //       }
//   //       return undefined;
//   //     }
//   //   };
//   // });
//   const objectType = memoize(() => {
//     const {
//       talliedSizeInBytes,
//       talliedSizeInItems
//     } = mVariableTracker;
//     addContext();
//     // addParent();
//     const inst = freeze({
//       ...BuiltinTypeBase.defaultsWith((): ObjectType => inst),
//       name: Token.kContextToken.content,
//       lookUp(operation: string | symbol): FunctionLookUpTable | undefined
//         { return mLookUpTable[operation]; },
//       sizeInBytes: () => talliedSizeInBytes(),
//       sizeInStackItems: () => talliedSizeInItems()
//     });
//     return inst;
//   });

//   const inst = freeze({
//     addDirectLookUp(name: string, table: FunctionLookUpTable): ContextTypeBuilder {
//       mLookUpTable[name] = table;
//       return inst;
//     },
//     addModifier,
//     addAccessor,
//     addInitialSet,
//     objectType
//   });
//   return inst;
// }

// const ContextTypeBuilder = freeze({ make });
// }
