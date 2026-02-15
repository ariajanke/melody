import { FunctionNamingSchema } from '../function_naming_schema';
import { FunctionLookUpTable, FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { Helpers } from '../helpers';
import { MemoryArray } from '../memory_array';
import { Token } from '../token';
import { BuiltinTypeBase } from './builtin_type';
import { ContextAttributeFactory } from './context_attribute_factory';
import { FunctionTypeBuildBase } from './function_type_build_base';
import { InitialSetImplementation } from './initial_set_implementation';
import { MutableFunctionTable } from './mutable_function_table';
import { TupleObjectFactory } from './tuple_type';
import { VariableTracker } from './variable_tracker';

const { freeze, memoize } = Helpers;

export interface ContextTypeBuilder {
  addInitialSet(
    name: string | readonly string[], definedBy: ObjectType): FunctionTypeBuild;
  addModifier(name: string, definedBy: ObjectType): FunctionType;
  addAccessor(name: string, definedBy: ObjectType): FunctionType;
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
    addModifier(name: string, definedBy: ObjectType): FunctionType {
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
    addInitialSet(name: string | readonly string[], definedBy: ObjectType): FunctionTypeBuild {
      const creation = InitialSetImplementation.make(name, definedBy, mVariableTracker);
      const ftype = creation.functionType();
      if (!ftype)
        { return creation; }

      mLookUpTable[mapToInitialSetName(name)] = MutableFunctionTable.
        make().
        setDefinition(definedBy, ftype);
      return FunctionTypeBuildBase.makeSuccessFromType(ftype);
    },
    objectType
  });
  return inst;
}

export const ContextTypeBuilder = freeze({ make });
