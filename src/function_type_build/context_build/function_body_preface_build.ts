import { FunctionType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { CodeWriter } from '../../code_writer';
import { FunctionTypeBase } from '../function_type_base';
import { TupleObjectFactory } from '../tuple_type_factory';
import { FunctionNamingSchema } from '../../function_naming_schema';
import {
  ExtendedAncestorInfo,
  UsedAncestorCollection
} from './used_ancestor_collection';
import { ContextAttributeFactory } from './context_attribute_factory';
import { VariableAllocation, VariableOffset } from './variable_allocation';
import { ContextAncestorAccessorsStage } from './context_ancestor_accessors_stage';

const { freeze, memoize } = Helpers;

// TODO this has an "and" and probably should be split up
//      preface ftype AND ancestor accessors (yuck!)
export interface FunctionBodyPrefaceBuild {
  functionType(): FunctionType;
};

function make
  (mVariableAllocation: VariableAllocation,
   mUsedAncestorCollection: UsedAncestorCollection,
   mContextAncestorAccessors: ContextAncestorAccessorsStage)
  : FunctionBodyPrefaceBuild
{
  const { hasParentGetter } = mUsedAncestorCollection;
  const { parentAccessInfo, parentGetter, referenceType } =
    mContextAncestorAccessors;
  const { emptyTuple } = TupleObjectFactory;
  const { kParentName, kContextName } = FunctionNamingSchema;

  // NOTE
  // calls a chain of parent getters across ancestors
  // subsequent calls have their receiver consumed, unless they're used
  const hopEmissions = memoize((): Readonly<((cw: CodeWriter) => void)[]> =>
    mUsedAncestorCollection.
    allAncestors().
    map((info: ExtendedAncestorInfo) => {
      // NOTE we're doing receiver resolution manually
      const ancSelfRef = info.type.
        lookUp(kContextName)?.
        byParameters(emptyTuple()) ??
        raise('cannot find self refence function <context>');

      const ancParentRef = info.type.
        lookUp(kParentName)?.
        byParameters(emptyTuple()) ??
        raise('cannot find self refence function <context>');

      return (writer: CodeWriter): void => {
        // NOTE assume a_{n-1} (info.type's context pointer) is on top...
        writer.setStackPointer();

        ancParentRef.
          emit(ancSelfRef, FunctionTypeBase.emitEmptyTuple(), writer);

        if (info.use === 'used') {
          writer.duplicateTop();
        }
      };
    }));

  const ancestorTupleEmission = memoize((): FunctionType => {
    if (parentGetter() === 'none')
      { raise('need parent'); }

    if (hopEmissions().length === 0) {
      return freeze({
        ...FunctionTypeBase.makeNewEmitlessEmpty(),
        simpleEmit: (_0: CodeWriter) => {}
      });
    }

    return freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      simpleEmit(writer: CodeWriter): void {
        (parentGetter() as FunctionType).simpleEmit(writer);
        hopEmissions().forEach(emitHop => emitHop(writer));
        writer.restoreStackPointerToGlobal();
      },
      returns: mUsedAncestorCollection.ancestorTupleType
    });
  });

  const saveLocalStackPointer = memoize((): FunctionType => freeze({
    ...FunctionTypeBase.makeNewEmitlessEmpty(),
    simpleEmit(writer: CodeWriter): void {
      writer.saveStackPointerToLocal();
      if (hasParentGetter()) {
        writer.
          storeParentPointer((parentAccessInfo() as VariableOffset).accessIndex);
      }
    }
  }));

  const ancestorInitialSet = memoize((): FunctionType => {
    if (parentGetter() === 'none')
      { raise('need parent'); }

    const ancestorTupleName = mUsedAncestorCollection.
      ancestors().
      map(value => value.variableName);
    const varInfo = mVariableAllocation.lookUpTuple(ancestorTupleName);
    if (!varInfo) {
      raise('ancestors must be allocated in order');
    }

    const setter = ContextAttributeFactory.
      buildInitialSetter(varInfo.accessIndex, varInfo.type);
    const getContext = referenceType().
      lookUp(kContextName)?.
      byParameters(emptyTuple()) ??
      raise('no self <context> on current reference');
    return freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      simpleEmit(writer: CodeWriter) {
        setter.emit(getContext!, ancestorTupleEmission(), writer);
      }
    });
  });

  const functionType = memoize((): FunctionType => freeze({
    ...FunctionTypeBase.makeNewEmitlessEmpty(),
    simpleEmit(writer: CodeWriter) {
      saveLocalStackPointer().simpleEmit(writer);

      if (hasParentGetter()) {
        ancestorInitialSet().simpleEmit(writer);
      }
    },
  }));

  return freeze({ functionType });
}

export const FunctionBodyPrefaceBuild = freeze({ make });
