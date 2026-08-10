import { FunctionLookUpTable, FunctionType, ObjectType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { MutableFunctionTable } from '../mutable_function_table';
import { CallAttributeCreation } from './call_attribute_creation';
import { ContextAttributeFactory } from './context_attribute_factory';
import { OrderedInitialSetsCollection } from './ordered_initial_sets_collection';
import { VariableAllocation } from './variable_allocation';

export type AttributesTuple = Readonly<[string, FunctionLookUpTable]>;

export interface AttributesCreation {
  // NOTE absence is not an error
  accessor(): AttributesTuple | undefined;
  modifier(): AttributesTuple | undefined;
  call(): AttributesTuple | undefined;
};

const { freeze, memoize } = Helpers;

function make
  (mReferenceType: ObjectType,
   mVariableName: string,
   mVariableNameMap: OrderedInitialSetsCollection['variableNameMap'],
   mVariableAllocation: VariableAllocation)
  : AttributesCreation
{
  const toFunctionTable = MutableFunctionTable.fromFunctionType;

  const { accessorName, modifierName } =
    mVariableNameMap()[mVariableName] ??
    raise(`Variable '${mVariableName}' was not mapped!`);

  const mFactory = ContextAttributeFactory.make(mReferenceType);

  const varInfo = memoize(() =>
    mVariableAllocation.lookUp(mVariableName) ??
    raise(`Cannot look up variable name '${mVariableName}', was it added?`));

  function makeAttribute
    (maker: (accessIndex: number, type: ObjectType) => FunctionType)
    : FunctionType
  { return maker(varInfo().accessIndex, varInfo().type); }

  const accessorFtype = memoize((): FunctionType | undefined => {
    if (!accessorName)
      { return undefined; }

    return makeAttribute(mFactory.buildGetter);
  });

  const accessor = memoize((): AttributesTuple | undefined => {
    if (!accessorFtype())
      { return undefined; }

    return [accessorName!, toFunctionTable(accessorFtype()!)];
  });

  const modifier = memoize((): AttributesTuple | undefined => {
    if (!modifierName)
      { return undefined; }

    return [modifierName, toFunctionTable(makeAttribute(mFactory.buildGeneralSetter))];
  });

  const call = memoize((): AttributesTuple | undefined => {
    if (!accessorFtype())
      { return undefined; }

    const ftype = CallAttributeCreation.of(accessorFtype()!);
    if (!ftype)
      { return undefined; }

    return [mVariableName, toFunctionTable(ftype)];
  });

  return freeze({ accessor, modifier, call });
}

export const AttributesCreation = freeze({ make });
