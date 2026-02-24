import { CodeWriter } from '../../code_writer';
import { FunctionNamingSchema } from '../../function_naming_schema';
import { FunctionLookUpTable, FunctionType, ObjectType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { FunctionTypeBase } from '../function_type_base';
import { MutableFunctionTable } from '../mutable_function_table';
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

function functionBeingCalledFor(possibleIndexGetter: FunctionType): FunctionType | undefined {
  const lookUp = possibleIndexGetter.returns().
    lookUp(FunctionNamingSchema.kCallName);
  if (!lookUp)
    { return undefined; }

  // NOTE there must be exactly one ftype in this table
  //      having more means more than one signature and
  //      a single index cannot support that
  return lookUp.uniqueFunctionType() ??
         raise('cannot support more than one index');
}

function makeCallableFunctionType
  (receiverType: ObjectType,
   indexGetter: FunctionType,
   functionToIndirectCall: FunctionType)
{
  const emit = (receiverFtype: FunctionType,
                parameterFtype: FunctionType,
                writer: CodeWriter): void =>
  {
    receiverFtype.simpleEmit(writer);
    indexGetter.emit(receiverFtype, parameterFtype, writer);
    writer.indirectCall(functionToIndirectCall);
  };

  return freeze({
    ...FunctionTypeBase.makeNewEmitlessEmpty(),
    receiver: () => receiverType,
    // NOTE only one set of params/returns supported so far
    //      returns: empty
    //      parameters: empty
    emit
  });
}

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

    const functionBeingCalled = functionBeingCalledFor(accessorFtype()!);
    if (!functionBeingCalled)
      { return undefined; }

    const ftype = makeCallableFunctionType(
      mReferenceType, accessorFtype()!, functionBeingCalled);

    return [mVariableName, toFunctionTable(ftype)];
  });

  return freeze({ accessor, modifier, call });
}

export const AttributesCreation = freeze({ make });
