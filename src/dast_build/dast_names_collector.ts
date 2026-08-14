import { BuiltinFunctionNames } from '../builtin_function_names';
import { DastFunctionNameMappings, DastNode, DastVisitor } from '../dast_build';
import { FunctionNamingSchema } from '../function_naming_schema';
import { GenericSet, Helpers, raise } from '../helpers';
import { CarriedNamesRegistry } from './carried_names_registry';

const { freeze } = Helpers;

export interface DastNamesCollector {
  collectFromNode(node: DastNode): DastNamesCollector;
  names(): Readonly<Set<string>>;
  descendentCarriedNames(): Readonly<Set<string>>;
};

const visitLiteral = (_0: string): void => {};

export type ScanOptions = 'forLetDependeeNames' | 'forFunctionDefinition';

function make
  (mScanBreadth: ScanOptions,
   mCarriedNamesRegistry?: CarriedNamesRegistry)
  : DastNamesCollector
{
  const contextName = () => FunctionNamingSchema.kContextName;
  const mNames = GenericSet.make<string>();
  const mDescendentCarriedNames = GenericSet.make<string>();
  const {
    mapToFringeAccessor, 
    isAnAssignmentName,
    isAFringeAccessorName,
    kParentName
  } = FunctionNamingSchema;
  const { isBuiltinFunctionName } = BuiltinFunctionNames;
  function checkForCarriesAndVisit(node: DastNode) {
    const names = mCarriedNamesRegistry?.lookup(node);
    if (names) {
      for (const name of names) {
        mDescendentCarriedNames.add(name);
      }
    }
    node.visit(mVisitor);
  }

  const mVisitor: DastVisitor<void> = freeze({
    visitFringe(v: string) {
      if (v === contextName() || isBuiltinFunctionName(v))
        { return; }
      mNames.add(mapToFringeAccessor(v));
    },
    visitString: visitLiteral,
    visitInteger: visitLiteral,
    visitCall(callName: string, receiver: DastNode, args: DastNode) {
      if (receiver.asString() === contextName() &&
          !isBuiltinFunctionName(callName))
      {
        // NOTE direct calls will still have a `.name`, they are just sort of
        //      immediately evaluated
        if (isAFringeAccessorName(callName)) {
          raise('explicit calls to fringe names are not supported for call nodes');
        }
        if (!isAnAssignmentName(callName)) {
          // TODO we gotta rethink the DAST here a bit
          mNames.add(mapToFringeAccessor(callName));
        } else {
          mNames.add(callName);
        }
      }

      checkForCarriesAndVisit(receiver);
      checkForCarriesAndVisit(args);
    },
    visitTuple(inner: Readonly<DastNode[]>) {
      inner.forEach(checkForCarriesAndVisit);
    },
    visitInitialSet(_0: readonly string[] | string, node: DastNode) {
      checkForCarriesAndVisit(node);
    },
    visitFunctionDefinition(defs: DastFunctionNameMappings, _1: Readonly<DastNode[]>) {
      if (mScanBreadth === 'forLetDependeeNames')
        { return; }

      if (!mCarriedNamesRegistry) {
        raise('attempted to collect names without a registry for carried names');
      }
      Object.
        keys(defs.pendingNames).
        forEach((name: string) => {
          if (name === kParentName)
            { return; }
          mDescendentCarriedNames.add(name);
        });
      // NOTE DO NOT recurse further
    }
  });

  const inst = freeze({
    collectFromNode(node: DastNode) {
      node.visit(mVisitor);
      return inst;
    },
    names: () => mNames,
    descendentCarriedNames: () => mDescendentCarriedNames
  });
  return inst;
}

export const DastNamesCollector = freeze({
  make,
  letDependeeNamesFor(node: DastNode): Readonly<Set<string>> | undefined {
    return make('forLetDependeeNames').collectFromNode(node).names();
  }
});
