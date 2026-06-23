import { FunctionType, MutableObjectType } from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { CodeWriter } from '../code_writer';
import { FunctionTypeBase } from './function_type_base';
import { TupleObjectFactory } from './tuple_type';
import { FunctionNamingSchema } from '../function_naming_schema';
import { StackSafetyChecker } from './stack_safety_checker';
import {
  AncestorInfo,
  ExtendedAncestorInfo,
  UsedAncestorCollection
} from './used_ancestor_collection';
import { ContextFactoryStage } from './context_factory_stage';

const { freeze, memoize } = Helpers;

export interface FunctionBodyPrefaceBuild {
  functionType(): FunctionType;
};

function make
  (//mStage: ContextFactoryStage,
   mPrototypeContext: MutableObjectType,
   mUsedAncestorCollection: UsedAncestorCollection)
  : FunctionBodyPrefaceBuild
{
  const { hasParentGetter } = mUsedAncestorCollection;

  const parentGetter = memoize((): FunctionType | undefined => {
    if (!hasParentGetter())
      { return undefined; }
    return mStage.intoObjectType().
      lookUp(FunctionNamingSchema.kParentName)?.
      byParameters(TupleObjectFactory.emptyTuple());
  });

  const saveLocalStackPointer = memoize((): FunctionType =>
    freeze({
      ...FunctionTypeBase.receivedByContext(),
      emit(writer: CodeWriter) {
        writer.forStackPointer('saveToLocal');
        if (hasParentGetter()) {
          writer.storeParentStackPointer();
        }
        return writer;
      }
    })
  );

  const ancestorAccessors = memoize((): Readonly<FunctionType[]> => {
    if (!parentGetter())
      { return []; }
    return mUsedAncestorCollection.ancestors().map((info: AncestorInfo) => {
      const accessorName = FunctionNamingSchema.
        mapToFringeAccessor(info.variableName);
      const build = mStage.
        intoAccessorBuild(accessorName, info, info.type);
      if (!build.functionType()) {
        raise(
          `Ancestor accessor "${accessorName}" failed to build: ` +
          `"${build.error().message}"`
        );
      }
      return build.functionType()!;
    });
  });

  const ancestorTupleEmission = memoize((): FunctionType => {
    if (!parentGetter())
      { raise('need parent'); }
    const ancs = mUsedAncestorCollection.allAncestors();
    if (ancs.length === 0) {
      return freeze({
        ...FunctionTypeBase.receivedByContext(),
        emit: (writer: CodeWriter) => writer,
        returns: TupleObjectFactory.emptyTuple
      });
    }
    const hopEmissions = ancs.map(
      (info: ExtendedAncestorInfo) =>
      (writer: CodeWriter): void => {
        info.type
          .lookUp(FunctionNamingSchema.kParentName)
          ?.byParameters(TupleObjectFactory.emptyTuple())!
          .emit(writer);
        if (info.use === 'used') {
          writer.duplicateTop();
        }
        writer.setStackPointer();
      }
    );
    StackSafetyChecker.make().check(parentGetter()!);
    const ftype = freeze({
      ...FunctionTypeBase.receivedByContext(),
      emit: (writer: CodeWriter) => {
        parentGetter()!.emit(writer);
        writer.duplicateTop().setStackPointer();
        hopEmissions.forEach(emitHop => emitHop(writer));
        writer.forStackPointer('restoreToGlobal');
      },
      returns: mUsedAncestorCollection.ancestorTupleType
    });
    StackSafetyChecker.make().check(ftype);
    return ftype;
  });

  const ancestorInitialSet = memoize((): FunctionType => {
    if (!parentGetter())
      { raise('need parent'); }
    const names = mUsedAncestorCollection.ancestorNames();
    const iSName = FunctionNamingSchema.mapToInitialSetName(names);
    const build = mStage
      .intoInitialSetBuild(iSName, names, mUsedAncestorCollection.ancestorTupleType());
    if (!build.functionType()) {
      raise(
        `Ancestor initial set unexpectedly failed to build: ` +
        `"${build.error().message}"`
      );
    }
    return freeze({
      ...FunctionTypeBase.receivedByContext(),
      emit: (writer: CodeWriter) => {
        ancestorTupleEmission().emit(writer);
        build.functionType()!.emit(writer);
        return writer;
      }
    });
  });

  const inst = freeze({
    functionType: memoize((): FunctionType => {
      // ensure ancestor accessors are built first
      ancestorAccessors();
      return freeze({
        ...FunctionTypeBase.receivedByLexical(),
        emit(writer: CodeWriter) {
          saveLocalStackPointer().emit(writer);
          if (hasParentGetter()) {
            ancestorInitialSet().emit(writer);
          }
          return writer;
        }
      });
    })
  });
  return inst;
}

export const FunctionBodyPrefaceBuild = freeze({ make });
