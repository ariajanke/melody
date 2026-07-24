import { CodeWriter } from '../../code_writer';
import { FunctionNamingSchema } from '../../function_naming_schema';
import { FunctionLookUpTable, FunctionType, ObjectType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { FunctionTypeBase } from '../function_type_base';
import { MutableFunctionTable } from '../mutable_function_table';
import { TupleObjectFactory } from '../tuple_type_factory';
import { NameTypePair } from './declaration_function_group';

const { freeze, memoize } = Helpers;

export interface NameLookUpPair {
  lookUpTable: FunctionLookUpTable;
  name: string;
};

export interface ImplicitCallCollection {
  collection(): Readonly<NameLookUpPair[]>;
};

function make
  (mReferenceType: ObjectType,
   mBreakdown: Readonly<NameTypePair[]>)
{
  function functionBeingCalledFor(indexGetter: FunctionType): FunctionType {
    const lookUp = indexGetter.
      returns().
      lookUp(FunctionNamingSchema.kCallName);
    if (!lookUp) {
      raise('not a valid callable');
    }
    // NOTE there must be exactly one ftype in this list
    //      having more means more than one signature and
    //      a single index cannot support that
    if (lookUp.list().length !== 1) {
      raise('cannot support more than one index (or list is empty?!)');
    }
    return lookUp.list()[0];
  }

  function indexGetterOf(name: string): FunctionType {
    return mReferenceType.
      lookUp(FunctionNamingSchema.mapToFringeAccessor(name))?.
      byParameters(TupleObjectFactory.emptyTuple()) ??
      raise('uh oh');
  }

  function pairIntoCall(v: NameTypePair): FunctionLookUpTable {
    const indexGetter = indexGetterOf(v.name);

    const functionBeingCalled = functionBeingCalledFor(indexGetter);

    const emit = (receiverFtype: FunctionType,
                  parameterFtype: FunctionType,
                  writer: CodeWriter): void =>
    {
      receiverFtype.simpleEmit(writer);
      parameterFtype.simpleEmit(writer);
      indexGetter.simpleEmit(writer);

      writer.indirectCall(functionBeingCalled);
    };

    const ftype = freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      receiver: () => mReferenceType,
      // returns: empty
      // parameters: empty
      emit
    });

    return MutableFunctionTable.make().
      setDefinition(functionBeingCalled.parameters(), ftype);
  }

  const implicitCallCandidates = () =>
    mBreakdown.
      filter((v: NameTypePair) =>
        v.type.lookUp(FunctionNamingSchema.kCallName));
  
  const collection = memoize((): Readonly<NameLookUpPair[]> =>
    implicitCallCandidates().
    map((v: NameTypePair) => {
      const lookUpTable = pairIntoCall(v);
      return { lookUpTable, name: v.name };
    }));

  return freeze({ collection });
}

export const ImplicitCallCollection = freeze({ make });
