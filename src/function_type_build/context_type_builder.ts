import { DastAttributeDeclaration } from '../dast_build';
import { FunctionNamingSchema } from '../function_naming_schema';
import { FunctionLookUpTable, FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { Helpers } from '../helpers';
import { MemoryArray } from '../memory_array';
import { Token } from '../token';
import { BuiltinTypeBase } from './builtin_type';
import { ContextAccessorBuild, ContextModifierBuild } from './context_attribute_build';
import { ContextAttributeFactory } from './context_attribute_factory';
import { FunctionTypeBuildBase } from './function_type_build_base';
import { InitialSetImplementation } from './initial_set_implementation';
import { MutableFunctionTable } from './mutable_function_table';
import { TupleObjectFactory } from './tuple_type';
import { VariableTracker } from './variable_tracker';

const { freeze, memoize } = Helpers;

// export interface ContextTypeBuilder {
//   addInitialSet(
//     name: string | readonly string[], definedBy: ObjectType): FunctionTypeBuild;
//   addModifier(name: string, definedBy: ObjectType): FunctionType;
//   addAccessor(name: string, definedBy: ObjectType): FunctionType;
//   addDirectLookUp(name: string, table: FunctionLookUpTable): ContextTypeBuilder;

//   objectType(): ObjectType;
// };

export interface ContextTypeBuilder {
  addInitialSet
    (name: string,
     brokenIntoVariables: Readonly<string[]>,
     definedBy: ObjectType): FunctionTypeBuild;
  addModifier(variableName: string, definedBy: ObjectType): FunctionType;
  addAccessor(variableName: string, definedBy: ObjectType): FunctionType;
  addDirectLookUp(name: string, table: FunctionLookUpTable): ContextTypeBuilder;

  objectType(): ObjectType;
};

const { mapToAssignment, mapToInitialSetName, mapToFringeAccessor } =
  FunctionNamingSchema;

function make(): ContextTypeBuilder {
  const mVariableTracker = VariableTracker.make();
  const {
    ensureVariablePresence,
    talliedSizeInBytes,
    talliedSizeInItems
  } = mVariableTracker;
  
  const mLookUpTable:
    { [op: string | symbol]: FunctionLookUpTable | undefined } = {};

  function getterFor(name: string): FunctionType {
    return mLookUpTable[mapToFringeAccessor(name)]?.
      byParameters(TupleObjectFactory.emptyTuple()) ??
      (() => { throw new Error('oh no!'); })();
  }

  function addAccessor(name: string, definedBy: ObjectType): FunctionType {
    if (FunctionNamingSchema.isAFringeAccessorName(name)) {
      throw new Error(`Expected a variable name, got "${name}"`);
    }
    const { type, accessIndex } = ensureVariablePresence(name, definedBy);
    const { emptyTuple } = TupleObjectFactory;
    const fType = ContextAttributeFactory.buildGetter(accessIndex, type);
    mLookUpTable[mapToFringeAccessor(name)] = MutableFunctionTable.
      make().
      setDefinition(emptyTuple(), fType);
    return fType;
  }

  const objectType = memoize((): ObjectType => {
    const inst = freeze({
      ...BuiltinTypeBase.defaultsWith((): ObjectType => inst),
      name: Token.kContextToken.content,
      lookUp(operation: string | symbol): FunctionLookUpTable | undefined
        { return mLookUpTable[operation]; },
      sizeInBytes: () => talliedSizeInBytes(),
      sizeInStackItems: () => talliedSizeInItems()
    });
    return inst;
  });

  const referenceType = memoize((): ObjectType => {
    const inst = freeze({
      ...BuiltinTypeBase.defaultsWith((): ObjectType => inst),
      name: () => `Reference(${Token.kContextToken.content()})`,
      lookUp(operation: string | symbol): FunctionLookUpTable | undefined
        { return mLookUpTable[operation]; },
      sizeInBytes: () => MemoryArray.kWordSizeInBytes,
      sizeInStackItems: () => 1,
    });
    return inst;
  });

  addAccessor(Token.kContextToken.content(), referenceType());

  const inst = freeze({
    addDirectLookUp(name: string, table: FunctionLookUpTable): ContextTypeBuilder {
      mLookUpTable[name] = table;
      return inst;
    },
    // special names biting me in the ass :/
    addModifier(name: string, definedBy: ObjectType): FunctionType {
      if (FunctionNamingSchema.isAnAssignmentName(name)) {
        throw new Error(`Expected a variable name, got "${name}"`);
      }

      addAccessor(name, definedBy);
      const { type, accessIndex } = ensureVariablePresence(name, definedBy);
      const getter = getterFor(name);
      const fType = ContextAttributeFactory.buildSetter(accessIndex, type, getter);
      mLookUpTable[mapToAssignment(name)] = MutableFunctionTable.
        make().
        setDefinition(type, fType);
      return fType;
    },
    addAccessor,
    // and we're going to unify the interface for this a bit
    // making it no longer schema aware
    addInitialSet(name: string, brokenInto: Readonly<string[]>, definedBy: ObjectType)
      : FunctionTypeBuild
    {
      if (!FunctionNamingSchema.isAnInitialSetName(name)) {
        throw new Error(`Expected an initial set name, got "${name}"`);
      }
      const creation = InitialSetImplementation.
        make(brokenInto, definedBy, mVariableTracker);
      const ftype = creation.functionType();
      if (!ftype)
        { return creation; }

      mLookUpTable[name] = MutableFunctionTable.
        make().
        setDefinition(definedBy, ftype);
      return FunctionTypeBuildBase.makeSuccessFromType(ftype);
    },
    objectType
  });
  return inst;
}

export interface ContextTypeBuilderN {
  addModifier(name: string, attr: DastAttributeDeclaration, basedOn: ObjectType): FunctionTypeBuild;
  addAccessor(name: string, attr: DastAttributeDeclaration, basedOn: ObjectType): FunctionTypeBuild;
  addInitialSet(name: string, variableNames: Readonly<string[]>, basedOn: ObjectType)
    : FunctionTypeBuild;
  addDirectLookUp(name: string, lookUpTable: FunctionLookUpTable): ContextTypeBuilderN;
  objectType(): ObjectType;
};

export const ContextTypeBuilderN = freeze({
  make(): ContextTypeBuilderN
{
  const mVariableTracker = VariableTracker.make();

  
  const mLookUpTable:
    { [op: string | symbol]: FunctionLookUpTable | undefined } = {};

  const { emptyTuple } = TupleObjectFactory;

  function addAccessor
    (name: string, attr: DastAttributeDeclaration, basedOn: ObjectType): FunctionTypeBuild
  {
    if (!FunctionNamingSchema.isAFringeAccessorName(name)) {
      throw new Error(`Expected an accessor name, got "${name}"`);
    }
    
    const fbuild = ContextAccessorBuild.make(attr, basedOn, mVariableTracker);
    const { functionType } = fbuild;
    if (functionType()) {  
      mLookUpTable[name] = MutableFunctionTable.
        make().
        setDefinition(emptyTuple(), functionType()!);
    }
    return fbuild;
  }

  function addModifier
    (name: string, attr: DastAttributeDeclaration, basedOn: ObjectType): FunctionTypeBuild
  {
    if (!FunctionNamingSchema.isAFringeAccessorName(name)) {
      throw new Error(`Expected a modifier name, got "${name}"`);
    }
    const fbuild = ContextModifierBuild.make(attr, basedOn, mVariableTracker, objectType());
    const { functionType } = fbuild;
    if (functionType()) {
      mLookUpTable[name] = MutableFunctionTable.
        make().
        setDefinition(emptyTuple(), functionType()!);
    }
    return fbuild;
  }

    function addInitialSet
      (name: string, brokenInto: Readonly<string[]>, definedBy: ObjectType)
      : FunctionTypeBuild
    {
      if (!FunctionNamingSchema.isAnInitialSetName(name)) {
        throw new Error(`Expected an initial set name, got "${name}"`);
      }
      const creation = InitialSetImplementation.
        make(brokenInto, definedBy, mVariableTracker);
      const ftype = creation.functionType();
      if (ftype) {
        mLookUpTable[name] = MutableFunctionTable.
          make().
          setDefinition(definedBy, ftype);
      }
      return creation;
    }

  const objectType = memoize(() => {
    const {
      talliedSizeInBytes,
      talliedSizeInItems
    } = mVariableTracker;
    const inst = freeze({
      ...BuiltinTypeBase.defaultsWith((): ObjectType => inst),
      name: Token.kContextToken.content,
      lookUp(operation: string | symbol): FunctionLookUpTable | undefined
        { return mLookUpTable[operation]; },
      sizeInBytes: () => talliedSizeInBytes(),
      sizeInStackItems: () => talliedSizeInItems()
    });
    return inst;
  });

  const inst = freeze({
    addDirectLookUp(name: string, table: FunctionLookUpTable): ContextTypeBuilderN {
      mLookUpTable[name] = table;
      return inst;
    },
    addModifier,
    addAccessor,
    addInitialSet,
    objectType
  });
  return inst;
} // end of make
});

export const ContextTypeBuilder = freeze({ make });
