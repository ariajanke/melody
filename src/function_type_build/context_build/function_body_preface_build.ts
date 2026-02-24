import { Helpers, raise } from '../../helpers';
import { CodeWriter } from '../../code_writer';
import { FunctionTypeBase } from '../function_type_base';
import { TupleObjectFactory } from '../tuple_type_factory';
import { FunctionNamingSchema } from '../../function_naming_schema';
import { UsedAncestorCollection } from './used_ancestor_collection';
import { ContextAttributeFactory } from './context_attribute_factory';
import { VariableAllocation } from './variable_allocation';
import { FunctionType, ObjectType } from '../../function_type_build';
import { AncestorTupleEmission } from './ancestor_tuple_emission';

const { freeze, memoize } = Helpers;

// TODO this has an "and" and probably should be split up
//      preface ftype AND ancestor accessors (yuck!)
export interface FunctionBodyPrefaceBuild {
  functionType(): FunctionType;
};

function makeRefGet(name: string, why: string) {
  return (obj: ObjectType): FunctionType => obj.
    lookUp(name)?.byParameters(TupleObjectFactory.emptyTuple()) ?? raise(why);
}

const selfReferenceOf =
  makeRefGet(FunctionNamingSchema.kContextName,
             'cannot find self reference function <context>');

function make
  (mVariableAllocation: VariableAllocation,
   mUsedAncestorCollection: UsedAncestorCollection,
   mReferenceType: ObjectType)
  : FunctionBodyPrefaceBuild
{
  const { parent } = mUsedAncestorCollection;

  const ancestorTupleReturns = memoize(() =>
    TupleObjectFactory.make(mUsedAncestorCollection.ancestors().map(({ type }) => type)));

  const ancestorTupleEmission = memoize((): FunctionType => {
    if (!parent())
      { raise('need parent'); }

    const emission = AncestorTupleEmission.
      make(mReferenceType,
           parent()!.type,
           mUsedAncestorCollection.allAncestorsOrdered());

    return freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      simpleEmit: emission.emitterFunction(),
      returns: ancestorTupleReturns
    });
  });

  const parentIndex = memoize(() => {
    if (!parent())
      { return undefined; }

    return mVariableAllocation.lookUp(parent()!.variableName)?.
           accessIndex ?? raise('variable and used ancestors conflict');
  });

  const ancestorTupleName = () =>
    mUsedAncestorCollection.
    ancestors().
    map(value => value.variableName);

  const ancestorInitialSet = memoize((): FunctionType | undefined => {
    if (!parent() || mUsedAncestorCollection.ancestors().length === 0)
      { return undefined; }

    const varInfo =
      mVariableAllocation.lookUpTuple(ancestorTupleName()) ??
      raise('ancestors must be allocated in order');
    // NOTE make sure we build this before emission
    if (ancestorTupleEmission().returns().uid() !==
        varInfo.type.uid())
    {
      raise('The ancestor tuple variable type must match the tuple emission.');
    }

    const contextGetter = selfReferenceOf(mReferenceType);
    const setter = ContextAttributeFactory.
      make(mReferenceType).
      buildInitialSetter(varInfo.accessIndex, varInfo.type);
    
    return freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      simpleEmit(writer: CodeWriter) {
        setter.emit(contextGetter!, ancestorTupleEmission(), writer);
      }
    });
  });

  const functionType = memoize((): FunctionType => freeze({
    ...FunctionTypeBase.makeNewEmitlessEmpty(),
    simpleEmit(writer: CodeWriter) {
      writer.saveStackPointerToLocal();

      if (parentIndex() !== undefined) {
        writer.storeParentPointer(parentIndex()!);
      }

      ancestorInitialSet()?.simpleEmit(writer);
    },
  }));

  return freeze({ functionType });
}

export const FunctionBodyPrefaceBuild = freeze({ make });
