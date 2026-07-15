import { DastDeclarationMap, DastLetDeclaration, DastNode } from '../../dast_build';
import { FunctionLookUpTable, FunctionTypeBuild, ObjectType } from '../../function_type_build';
import { Helpers, raise, StandardError, StandardErrorMessage } from '../../helpers';
import { MutableFunctionTable } from '../mutable_function_table';
import { TupleObjectFactory } from '../tuple_type';
import { ContextAttributeFactory } from './context_attribute_factory';
import { FunctionOpLookUp } from './context_base_stage';
import { DeclarationVariableAllocation } from './declaration_variable_allocation';
import { VariableAllocation } from './variable_allocation';
import { DeclarationValuesMapBuild } from './declaration_values_map_build';
import { FunctionNamingSchema } from '../../function_naming_schema';

const { freeze, memoize } = Helpers;

export interface ContextDeclarationBuild_ {
  referenceType(): ObjectType | undefined;
  aggregateType(): ObjectType | undefined;
  error(): StandardErrorMessage;
};
type thing = {
  fbuild: FunctionTypeBuild;
  initialSetName: string;
  fnames: Readonly<string[]>;
  vnames: Readonly<string[]>;
};
type NameTypePair = { name: string; type: ObjectType; };
interface DeclarationFunctionGroup {
  baseValueFunctionBuild(): FunctionTypeBuild;
  functionNames(): Readonly<string[]>;
  variableBreakdown(): Readonly<NameTypePair[]>;
};
const DeclarationFunctionGroup = freeze({
  make(mFunctionTypeBuild: FunctionTypeBuild,
       mFunctionNames: Readonly<string[]>,
       mVariableNames: Readonly<string[]>
  ) {
    const functionTypeBuild = () => mFunctionTypeBuild;
    const functionNames = () => mFunctionNames;
    // NOTE this should not be this fbuild's initial evaluation of
    //      "functionType"
    const type = () => mFunctionTypeBuild.functionType()?.returns() ??
      raise('fbuild is suppose to be error checked first');
    const types = memoize(() => {
      const t = type();
      return t.detuplify() ?? [t];
    });

    const variableBreakdown = memoize(() => {
      return mVariableNames.map((name: string, idx: number) => {
        const type = types()[idx] ?? raise('malformed DAST?');
        return { name, type };
      });
    });

    return freeze({
      functionNames, variableBreakdown, functionTypeBuild
    });
  }
})
interface OrderedDeclarationGroupCollection {
  orderedGroups(): DeclarationFunctionGroup;
};

const OrderedDeclarationGroupCollection = freeze({
  make(mDeclarationsMap: DastDeclarationMap,
       mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild
  ) {
    type ValueMap = { [dastNodeUid: number]: { 
      initialSetName?: string;
      fnames: string[]; } | undefined };
    const valueMap = memoize((): ValueMap => {
      const valueMap_: ValueMap = {};
      for (const name in mDeclarationsMap) {
        const decl = mDeclarationsMap[name];
        const map = valueMap_[decl.value.uid()] ??= { fnames: [] };
        const { fnames } = map;
        if (decl.initialSet) {
          map['initialSetName'] = name;
        }
        fnames.push(name);
      }
      return valueMap_;
    });

    const mOrder: thing[] = [];
    const mDone : { [dastNodeUid: number]: true | undefined };

    function appendInitialSetFrom(name: string) {
      const decl = mDeclarationsMap[name];
      if (!decl)
        { return; }

      const initialSetName = valueMap()[decl.value.uid()]?.initialSetName ??
        raise('malformed DAST?');
      appendInitialSet(initialSetName);
    }

    // what if only do initial sets?
    // we can't because dependeeNames might not be initial sets...
    function appendInitialSet(name: string) {
      const decl = mDeclarationsMap[name];
      const { uid } = decl.value;
      if (!decl || mDone[uid()])
        { return; }
      if (!decl.initialSet)
        { raise('called wrong!'); }
      
      const { dependeeNames } = decl.initialSet;
      dependeeNames.forEach(appendInitialSetFrom);
    
      const { fnames, initialSetName } = valueMap()[uid()] ?? raise('uh oh');
      const fbuild = mIntoFunctionTypeBuild(decl.value);
      const vnames = decl.initialSet.variableNames;

      if (!initialSetName)
        { raise('uh oh'); }
      
      mDone[uid()] = true;
      mOrder.push({ fnames, initialSetName, fbuild, vnames });
    }

    const orderedGroups = memoize(() => {
      for (const name in mDeclarationsMap) {
        appendInitialSetFrom(name);
      }
      return mOrder.map((t: thing) => 
        DeclarationFunctionGroup.make(t.fbuild, t.fnames, t.vnames));
    });

    return freeze({
      orderedGroups,
    });
  }
});
const DeclarationLookUpTable = freeze({
  make(mDecl: DastLetDeclaration,
        mVariableAllocation: VariableAllocation
      ): FunctionLookUpTable {
    const varInfo = memoize(() => {
      const singularName =
        mDecl.accessor?.variableName ?? mDecl.assignment?.variableName;
      const rv = singularName ?
        mVariableAllocation.lookUp(singularName) :
        mVariableAllocation.lookUpTuple(mDecl.initialSet?.variableNames ?? raise('bad decl'));

      return rv ?? raise(`variable was not added yet`);
    });
    const chosenFactory = () => {
      if (mDecl.accessor)
        { return ContextAttributeFactory.buildGetter; }
      if (mDecl.assignment) {
        return ContextAttributeFactory.buildGeneralSetter;
      }
      return ContextAttributeFactory.buildInitialSetter;
    };
    const ftype = chosenFactory()(varInfo().accessIndex, varInfo().type);

    return MutableFunctionTable.make().
      setDefinition(varInfo().type, ftype)
  }
});

export const ContextDeclarationBuild_ = freeze({
  make(mVariableAllocation: VariableAllocation,
       mReferenceTypeLookUpTable: FunctionOpLookUp,
       mDeclarationsMap: DastDeclarationMap,
       mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild,
       mReferenceType: ObjectType
  ): ContextDeclarationBuild_
  {
    const { error, setErrorFn } = StandardError.make();

    const thingie = OrderedDeclarationGroupCollection.make(mDeclarationsMap, mIntoFunctionTypeBuild);

    thingie.orderedGroups().forEach((t: DeclarationFunctionGroup) => {
      const ftype = t.baseValueFunctionBuild().functionType();
      // what if the build fails?
      if (!ftype) {
        // ...
      }

      // variable allocation then...
      const varAlloc = t.variableBreakdown().
        reduce((prev: VariableAllocation, cur: NameTypePair) => {
          return prev.next(cur.name, cur.type);
        }, mVariableAllocation);

      // add functions
      t.functionNames().forEach((name: string) => {
        mReferenceTypeLookUpTable[name] = DeclarationLookUpTable.
          make(mDeclarationsMap[name], varAlloc);
      });
    });

    
    // get our build order for initial sets
    // per initial set in order, for each var name build the values for each of
    //   var's functions, add those functions to the reference type's ftable
    // then repeat until you're out of initial sets
    // finish 

    // declaration value ftypes, build in order, if that mapper ain't there
    // it failed
    const valuesMapBuild = DeclarationValuesMapBuild.
      make(mDeclarationsMap, mIntoFunctionTypeBuild);

    const returnTypeOf = memoize(() => {
      const toBuild = valuesMapBuild.valueToBuildCacheFunction();
      if (!toBuild)
        { return setErrorFn(valuesMapBuild.error); }

      return (node: DastNode) =>
        toBuild(node)?.functionType()?.returns() ??
          raise('');
    });

    const fullVariableAllocation = memoize(() => {
      const rtOf = returnTypeOf();
      if (!rtOf)
        { return undefined; }

      return DeclarationVariableAllocation.
        make(mVariableAllocation, rtOf, mDeclarationsMap).
        variableAllocation();
    });

    function addContextFunctions() {
      const varAlloc = fullVariableAllocation();

      if (!varAlloc) 
        { return undefined; }

      for (const name in mDeclarationsMap) {
        const decl = mDeclarationsMap[name];
        if (decl.accessor) {
          const varInfo = varAlloc.lookUp(decl.accessor.variableName);
          if (!varInfo) { raise('oh no!'); }
          const ftype = ContextAttributeFactory.
            buildGetter(varInfo.accessIndex, varInfo.type);
          mReferenceTypeLookUpTable[name] = MutableFunctionTable.make().
            setDefinition(TupleObjectFactory.emptyTuple(), ftype);
        }
        if (decl.assignment) {
          const varInfo = varAlloc.lookUp(decl.assignment.variableName);
          if (!varInfo) { raise('oh no!'); }
          const ftype = ContextAttributeFactory.
            buildSetter(varInfo.accessIndex, varInfo.type);
          mReferenceTypeLookUpTable[name] = MutableFunctionTable.make().
            setDefinition(varInfo.type, ftype);
        }
        if (decl.initialSet) {
          const varInfo = varAlloc.lookUp(decl.initialSet.);
          if (!varInfo) { raise('oh no!'); }
          const ftype = ContextAttributeFactory.
            buildSetter(varInfo.accessIndex, varInfo.type);
          mReferenceTypeLookUpTable[name] = MutableFunctionTable.make().
            setDefinition(varInfo.type, ftype);
        }
      }
    }

    // what's the aggregate type?
    // pretty simple, we're not throwing aggregates around atm
    // this is essentially just for the ftype call builds
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

      addContextFunctions();
      return mReferenceType;
    })

    return freeze({ referenceType, aggregateType, error });
  }
});
