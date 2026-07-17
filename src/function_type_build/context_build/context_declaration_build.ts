import { CodeWriter } from '../../code_writer';
import { DastDeclarationMap, DastNode } from '../../dast_build';
import { FunctionNamingSchema } from '../../function_naming_schema';
import { FunctionType, FunctionTypeBuild, ObjectType } from '../../function_type_build';
import { Helpers, StandardError, StandardErrorMessage, raise } from '../../helpers';
import { FunctionTypeBase } from '../function_type_base';
import { TupleObjectFactory } from '../tuple_type';
import { FunctionOpLookUp } from './context_base_stage';
import { DeclarationFunctionGroup, NameTypePair } from './declaration_function_group';
import { DeclarationLookUpTable } from './declaration_look_up_table';
import { OrderedDeclarationsGroupCollection } from './ordered_declaration_groups_collection';
import { VariableAllocation } from './variable_allocation';

const { freeze, memoize } = Helpers;

export interface ContextDeclarationBuild_ {
  // TODO also get our cached (DAST node -> ftype build) map?
  referenceType(): ObjectType | undefined;
  aggregateType(): ObjectType | undefined;
  error(): StandardErrorMessage;
};

// interface EmitterContext {
//   passParameterFunction(ftype: FunctionType, fn: () => void): void;

// };

function make
  (mVariableAllocation: VariableAllocation,
   mReferenceTypeLookUpTable: FunctionOpLookUp,
   mDeclarationsMap: DastDeclarationMap,
   mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild,
   mReferenceType: ObjectType)
: ContextDeclarationBuild_
{
  const { error, setErrorFn } = StandardError.make();

  const { orderedGroups } = OrderedDeclarationsGroupCollection.make(mDeclarationsMap, mIntoFunctionTypeBuild);

  const makeImplicitCalls = (
    mReferenceType: ObjectType,
    mBreakdown: Readonly<NameTypePair[]>) =>
  {
    mBreakdown.
      filter((v: NameTypePair) =>
        v.type.lookUp(FunctionNamingSchema.kCallName)).
      map((v: NameTypePair) => {
        const indexGetter = mReferenceType.
          lookUp(FunctionNamingSchema.mapToFringeAccessor(v.name))?.
          byParameters(TupleObjectFactory.emptyTuple()) ??
          raise('uh oh');
        const emit = (receiverFtype: FunctionType,
                      parameterFtype: FunctionType,
                      writer: CodeWriter): void =>
        {
          receiverFtype.simpleEmit(writer);
          parameterFtype.simpleEmit(writer);
          indexGetter.simpleEmit(writer);
          writer.
            // pushRepresentation( /* need aggregate size */ ).
            pushStackPointer().
            addIntegers().
            setStackPointer();

          // TODO do the actual call
          // writer.indirectCall(...)

          writer.forStackPointer('restoreToGlobal');
        };
        const ftype = freeze({
          ...FunctionTypeBase.makeNewEmitlessEmpty(),
          // returns: empty
          // parameters: empty
          emit
        });
        return [v.name, ftype];
      });
  };

  const fullVariableAllocation = memoize(() => orderedGroups().
    reduce((startingAlloc: VariableAllocation | undefined, t: DeclarationFunctionGroup) => {
      if (!startingAlloc)
        { return undefined; }

      // NOTE higly state dependant, build the base value node first,
      //      variable and function types will depend on it
      const { functionType, error } = t.baseValueFunctionBuild();
      
      if (!functionType()) {
        return setErrorFn(error)
      }

      const newAlloc = t.variableBreakdown().
        reduce((prev: VariableAllocation, cur: NameTypePair) => {
          return prev.next(cur.name, cur.type);
        }, startingAlloc);

      // NOTE we must add functions as they maybe depended upon in future base
      //      value builds
      t.functionNames().forEach((name: string) => {

        mReferenceTypeLookUpTable[name] = DeclarationLookUpTable.
          make(mDeclarationsMap[name], newAlloc);
      });

      return newAlloc;
    }, mVariableAllocation));

  const aggregateType = memoize((): ObjectType | undefined => {
    if (!fullVariableAllocation())
      { return undefined; }

    return freeze({
      name: () => 'AggregateContext',
      lookUp: (_0: string | symbol) => undefined,
      detuplify: () => undefined,
      uid: memoize(Symbol),
      sizeInBytes: fullVariableAllocation()!.talliedSizeInBytes,
      sizeInStackItems: fullVariableAllocation()!.talliedSizeInItems
    });
  });

  const referenceType = memoize((): ObjectType | undefined => {
    if (!fullVariableAllocation())
      { return undefined; }

    return mReferenceType;
  });

  return freeze({ referenceType, aggregateType, error });
}

export const ContextDeclarationBuild_ = freeze({ make });
