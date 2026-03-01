import { CodeWriter } from '../code_writer';
import { DastAttributeDeclaration } from '../dast_build';
import { FunctionNamingSchema } from '../function_naming_schema';
import { FunctionLookUpTable, FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { Helpers } from '../helpers';
import { MemoryArray } from '../memory_array';
import { Token } from '../token';
import { BuiltinTypeBase } from './builtin_type';
import { ContextAccessorBuild, ContextModifierBuild } from './context_attribute_build';
import { InitialSetImplementation } from './initial_set_implementation';
import { MutableFunctionTable } from './mutable_function_table';
import { TupleObjectFactory } from './tuple_type';
import { VariableTracker } from './variable_tracker';

const { freeze, memoize } = Helpers;

export interface ContextTypeBuilder {
  addModifier(name: string, attr: DastAttributeDeclaration, basedOn: ObjectType): FunctionTypeBuild;
  addAccessor(name: string, attr: DastAttributeDeclaration, basedOn: ObjectType): FunctionTypeBuild;
  addInitialSet(name: string, variableNames: Readonly<string[]>, basedOn: ObjectType)
    : FunctionTypeBuild;
  addDirectLookUp(name: string, lookUpTable: FunctionLookUpTable): ContextTypeBuilder;
  objectType(): ObjectType;
};

function make(): ContextTypeBuilder {
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
    if (!FunctionNamingSchema.isAnAssignmentName(name)) {
      throw new Error(`Expected a modifier name, got "${name}"`);
    }
    const accName = FunctionNamingSchema.mapToFringeAccessor(attr.variableName);
    const accBuild = addAccessor(accName, attr, basedOn);
    if (!accBuild.functionType()) {
      return accBuild;
    }
    const fbuild = ContextModifierBuild.make(attr, basedOn, mVariableTracker, objectType());
    const { functionType } = fbuild;
    if (functionType()) {
      mLookUpTable[name] = MutableFunctionTable.
        make().
        setDefinition(functionType()!.parameters(), functionType()!);
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

  const referenceType = memoize((): ObjectType => {
    const inst = freeze({
      ...BuiltinTypeBase.defaultsWith((): ObjectType => inst),
      name: () => `Reference(${Token.kContextToken.content()})`,
      lookUp(operation: string | symbol): FunctionLookUpTable | undefined
        { return objectType().lookUp(operation); },
      sizeInBytes: () => MemoryArray.kWordSizeInBytes,
      sizeInStackItems: () => 1,
    });
    return inst;
  });

  const referenceGetter = memoize((): FunctionType => {
    const ftype = freeze({
      parameters: () => TupleObjectFactory.emptyTuple(),
      returns: () => referenceType(),
      emit(codeWriter: CodeWriter) {
        // as in preface a call...
        return codeWriter.pushStackPointer();
      },
      uid: memoize(Symbol)
    });
    return ftype;
  });

  const addContext = memoize(() => {
    mLookUpTable[Token.kContextToken.content()] = {
      byParameters(type: ObjectType) {
        if (type.uid() === TupleObjectFactory.emptyTuple().uid()) {
          return referenceGetter();
        }
        return undefined;
      }
    };
  });

  const objectType = memoize(() => {
    const {
      talliedSizeInBytes,
      talliedSizeInItems
    } = mVariableTracker;
    addContext();
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
    addDirectLookUp(name: string, table: FunctionLookUpTable): ContextTypeBuilder {
      mLookUpTable[name] = table;
      return inst;
    },
    addModifier,
    addAccessor,
    addInitialSet,
    objectType
  });
  return inst;
}

export const ContextTypeBuilder = freeze({ make });
