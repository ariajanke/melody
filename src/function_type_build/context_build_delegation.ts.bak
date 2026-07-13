import { FunctionType, ObjectType } from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { CodeWriter } from '../code_writer';
import { TupleObjectFactory } from './tuple_type';
import { FunctionNamingSchema } from '../function_naming_schema';
import { ContextFactoryStage } from './context_factory_stage';
import { MutableFunctionTable } from './mutable_function_table';
import { DeclaredContextStack } from './declared_context_stack';

const { freeze, memoize } = Helpers;

export interface ContextBuildDelegation {
  applyDelegations(): ObjectType;
};

function make
  (mStage: ContextFactoryStage,
   mStackThing: DeclaredContextStack,
   mPendingNames: Readonly<{ [key: string]: unknown }>)
  : ContextBuildDelegation
{
  const delegatedFtypes = memoize(() => {
    for (const pendingName in mPendingNames) {
      if (pendingName === FunctionNamingSchema.kParentName)
        { continue; }
      const snapshot = mStackThing.contextForHop(
        mStackThing.hopCountFor(pendingName)
      )!;
      const ancestorAccessor = (
        mStage.intoObjectType().lookUp(snapshot.name()) ??
        mStage.intoObjectType().lookUp(
          FunctionNamingSchema.mapToFringeAccessor(snapshot.name())
        )
      )?.byParameters(TupleObjectFactory.emptyTuple());
      if (!ancestorAccessor) {
        raise(
          `Missing ancestor accessor for "${pendingName}" ` +
          `in context "${snapshot.name()}"`
        );
      }
      snapshot.contextType().lookUp(pendingName)?.list().forEach(ft => {
        const delegationFunctionType: FunctionType = freeze({
          alternateReceiver: () => snapshot.name(),
          parameters: ft.parameters,
          returns: ft.returns,
          emit(writer: CodeWriter) {
            ancestorAccessor.emit(writer);
            writer.setStackPointer();
            ft.emit(writer);
            writer.forStackPointer('restoreToGlobal');
          },
          uid: memoize(Symbol)
        });
        const lookUp = MutableFunctionTable.
          make().
          setDefinition(ft.parameters(), delegationFunctionType);
        mStage.intoDirectLookUp(pendingName, lookUp);
      });
    }
  });

  const inst = freeze({
    applyDelegations: memoize((): ObjectType => {
      delegatedFtypes();
      return mStage.intoObjectType();
    })
  });
  return inst;
}

export const ContextBuildDelegation = freeze({ make });
