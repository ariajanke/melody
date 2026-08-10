import { FunctionNamingSchema } from '../../function_naming_schema';
import { FunctionType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { FunctionTypeBase } from '../function_type_base';
import { TupleObjectFactory } from '../tuple_type_factory';
import { CodeWriter } from '../../code_writer';

const { freeze } = Helpers;

function wrappedIndexGetterOf(originalIndexGetter: FunctionType): FunctionType {
  const { emptyTuple } = TupleObjectFactory;
  const { emitEmptyTuple, makeNewEmitlessEmpty } = FunctionTypeBase;

  const selfRefFtype = originalIndexGetter.
    receiver().
    lookUp(FunctionNamingSchema.kContextName)?.
    byParameters(emptyTuple()) ??
    raise('uh oh');

  return freeze({
    ...makeNewEmitlessEmpty(),
    returns: originalIndexGetter.returns,
    simpleEmit(writer: CodeWriter) {
      originalIndexGetter.emit(selfRefFtype, emitEmptyTuple(), writer);
    }
  });
}

function make
  (mPossibleIndexGetter: FunctionType)
  : FunctionType | undefined
{
  const lookUp = mPossibleIndexGetter.returns().
    lookUp(FunctionNamingSchema.kCallName);
  if (!lookUp)
    { return undefined; }

  // NOTE there must be exactly one ftype in this table
  //      having more means more than one signature and
  //      a single index cannot support that
  const representativeFtype = lookUp.uniqueFunctionType() ??
    raise('cannot support more than one index');

  const { emitEmptyTuple, makeNewEmitlessEmpty } = FunctionTypeBase;
  
  const isOriginal =
    mPossibleIndexGetter.receiver().uid() === representativeFtype.receiver().uid();
  const wrappedIndexGetter =
    !isOriginal ? wrappedIndexGetterOf(mPossibleIndexGetter) : undefined;
    
  const emit = (receiverFtype: FunctionType,
                parameterFtype: FunctionType,
                writer: CodeWriter): void =>
  {
    receiverFtype.simpleEmit(writer);
    parameterFtype.simpleEmit(writer);

    if (wrappedIndexGetter) {
      wrappedIndexGetter.simpleEmit(writer);
    } else {
      mPossibleIndexGetter.emit(receiverFtype, emitEmptyTuple(), writer);
    }
    writer.indirectCall(representativeFtype);
  };
    
  return freeze({
    ...makeNewEmitlessEmpty(),
    // TODO capture in testing that this is correct
    receiver: () => representativeFtype.receiver(),
    // NOTE only one set of params/returns supported so far
    //      returns: empty
    //      parameters: empty
    emit
  });
}

export const CallAttributeCreation = freeze({ of: make });
