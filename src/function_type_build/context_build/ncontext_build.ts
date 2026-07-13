import { BuiltinFunctionNames } from '../../builtin_function_names';
import { DastDeclarationMap, DastFunctionNameMappings, DastNode } from '../../dast_build';
import { FunctionNamingSchema } from '../../function_naming_schema';
import { FunctionLookUpTable, FunctionType, FunctionTypeBuild, ObjectType } from '../../function_type_build';
import { Helpers, StandardError, StandardErrorMessage, raise } from '../../helpers';
import { DeclaredContextStack } from '../declared_context_stack';
import { FunctionTypeBase } from '../function_type_base';
import { MutableFunctionTable } from '../mutable_function_table';
import { PutsFunctionLookUpTable } from '../puts_function_look_up_table';
import { AncestorInfo, UsedAncestorCollection } from './used_ancestor_collection';
import { CodeWriter  } from '../../code_writer';
import { TupleObjectFactory } from '../tuple_type';
import { ObjectTypeBuild } from '../context_attribute_build';
import { BuiltinTypeBase } from '../builtin_type';
import { MemoryArray } from '../../memory_array';
import { FunctionBodyPrefaceBuild } from '../function_body_preface_build';
import { ContextAttributeFactory } from './context_attribute_factory';

// We conceptualize the preface ftype as an initial setter
// There's setting the parent pointer, and then the ancestors
// For a proper ftype I need the object type for the pointers.
// These are just "references", which are fully knowable and freezable.
// ContextTypes are references by definition, because of how accessors and
// modifiers are defined.
// So it's not out of line to just pass whole ObjectType(s)

// I want to get rid of the "holder" concept entirely (for this context).
// Just have the declared stack and it's stack of reference (pointer) types.

// So when recurring, we want something more stripped down.
// Some kind of "container" so we can check if something is defined.
// Have some kind of way to key into the reference type itself.

// Variable layout of a frame:
// parent
// n ancestors
// m variables (declared names)

const { freeze, memoize } = Helpers;




// What if you took your observed friction here, and turn that
// into a basis for SLM use? (Since I can't really afford LLMs atm)


// Why? My anhedonia, one day I'll escape
// Order brings me pleasure.
//
// What's the relationship between receiver and a typical member function?
// In a call, we do not have a notion that any particular receiver is mounted.
// Fringes don't appear to explicitly mount the receiver.
// - Consequence: they have a "none" receiver
// - These "base cases" for call trees where the "receive, args, call"
//   routine stops
//
// I want to:
// - clear up receiver and calls relationship
// - replace "stage"
// - get rid of "<context>" nodes in the DAST, possibly replacing it with "none"






// Proposed redefinition:
// Context means "the implicit receiver"
// And the current stack frame type, is just that, the StackFrame type

/// A ContextLinkCreation is the second stage, where the current stack frame's
/// ancestors are incorperated which sets initial behavior.

// I'm still really not sure how I want to do this



// const ContextDelegationFunctionType = freeze({
//   make(mName: string,
//        mFrameStack: ContextFrameStack,
//        mDelegateeType: ObjectType,
       
//   ): FunctionTypeBuild {
    
//     const { mapToFringeAccessor } = FunctionNamingSchema;
//     const snapshot = () =>
//       mFrameStack.contextForHop(mFrameStack.hopCountFor(mName));
//     // const accessorTable = () =>
//     //   mDelegateeType.lookUp(mName) ??
//     //   mDelegateeType.lookUp(mapToFringeAccessor(mName));
//     // const ancestorAccessor = memoize(() => accessorTable()?.byParameters
//     snapshot()?.referenceType()?.lookUp(mName);
//   }
// });


// this does have an error state, because this builds nodes into ftypes


interface DeclarationValuesMapBuild {
  /// NOTE if this returns, then all subsequent builds are successful
  valueToBuildCacheFunction(): ((node: DastNode) => FunctionTypeBuild | undefined) | undefined;
  error(): StandardErrorMessage;
}

interface DeclarationsBuildOrder {
  buildsInOrder(): Readonly<FunctionTypeBuild[]>;
  mapDastToBuild(node: DastNode): FunctionTypeBuild | undefined;
};

const DeclarationsBuildOrder = freeze({
  make(
    mDeclarationsMap: DastDeclarationMap,
    mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild)
  : DeclarationsBuildOrder
  {
    const mDastSet: { [dastUid: number]: FunctionTypeBuild } = {};
    const mFtypeBuildOrder: FunctionTypeBuild[] = [];

    function addFtypeBuildOnceFor(node: DastNode) {
      const build = mIntoFunctionTypeBuild(node);
      if (mDastSet[node.uid()])
        { return; }
      mDastSet[node.uid()] = build;
      mFtypeBuildOrder.push(build);
    }

    const varNameToDependees = memoize(() => {
      const varNameToDependees_: { [name: string]: { dependeeNames: Readonly<string[]>; value: DastNode; } } = {};
      for (const name in mDeclarationsMap) {
        const decl = mDeclarationsMap[name];
        if (decl.initialSet === undefined)
          { continue; }
        const { variableNames, dependeeNames } = decl.initialSet;
        variableNames.forEach((name: string) => {
          varNameToDependees_[name] = { dependeeNames, value: decl.value };
        }); 
      }
      return varNameToDependees_;
    });

    function doName(name: string): void {
      const { dependeeNames, value } = varNameToDependees()[name];
      dependeeNames.forEach(doName);
      addFtypeBuildOnceFor(value);
    }

    function iterateVarNames() {
      for (const name in varNameToDependees()) {
        doName(name);
      }
    }

    const inst = freeze({
      buildsInOrder: memoize((): Readonly<FunctionTypeBuild[]> => {
        iterateVarNames();
        return mFtypeBuildOrder;
      }),
      mapDastToBuild(node: DastNode): FunctionTypeBuild | undefined {
        inst.buildsInOrder();
        return mDastSet[node.uid()];
      }
    });
    return inst;
  }
});

const DeclarationValuesMapBuild = freeze({
  make(mDeclarationsMap: DastDeclarationMap,
       mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild)
    : DeclarationValuesMapBuild
  {
    const { setErrorFn, error } = StandardError.make();

    // const mBuildCache: { [dastUid: number]: FunctionTypeBuild | undefined } = {};
    // const declarationValueBuildsInOrder = memoize(() =>
    //   setDeclarationBuildsInOrder(mDeclarationsMap, mIntoFunctionTypeBuild));
    const { buildsInOrder, mapDastToBuild } = DeclarationsBuildOrder.
      make(mDeclarationsMap, mIntoFunctionTypeBuild);
    const failedBuild = memoize(() =>
      buildsInOrder().
      reduce((prev: FunctionTypeBuild | undefined, build: FunctionTypeBuild) => {
        if (prev)
          { return prev; }

        if (build.functionType())
          { return undefined; }

        return build;
      }, undefined));

    const valueToBuildCacheFunction = memoize(() => {
      const fbuild = failedBuild();
      if (fbuild) {
        return setErrorFn(fbuild.error);
      }

      return mapDastToBuild;
    });

    return freeze({ valueToBuildCacheFunction, error })
  }
});

interface DeclarationVariableAllocation {
  variableAllocation(): VariableAllocation;

};

const DeclarationVariableAllocation = freeze({
  make(mVariableAllocation: VariableAllocation,
       mReturnValueOfNode: (node: DastNode) => ObjectType,
       mDeclarationsMap: DastDeclarationMap
  )
    : DeclarationVariableAllocation
  {
    function upto<T>(i: number, n: number, withT: T, fn: (i: number, t: T) => T) {
      if (n < 0)
        { raise(`Index must be a non-negative integer`); }
      return upto(i + 1, n, fn(i, withT), fn);
    }

    function allocateForNames(varAlloc: VariableAllocation, names: Readonly<string[]>, node: DastNode) {
      const varType = mReturnValueOfNode(node);
      const types = names.length > 1 ? varType.detuplify() : [varType];
      if (!types)
        { raise('multiple names for non tuple'); }
      if (types.length !== names.length) {
        raise('oh no');
      }
      return upto(0, types.length, varAlloc, (idx: number, varAlloc: VariableAllocation) => {
        return varAlloc.next(names[idx], types[idx]);
      });
    }
    const variableAllocation = memoize(() =>
      Object.
        keys(mDeclarationsMap).
        reduce((prev: VariableAllocation, name: string) => {
          const decl = mDeclarationsMap[name];
          if (!decl.initialSet)
            { return prev; }
          return allocateForNames(prev, decl.initialSet.variableNames, decl.value);
        }, mVariableAllocation));
    return freeze({ variableAllocation });
  }
});

const ContextDeclarationBuild = freeze({
  make(mVariableAllocation: VariableAllocation,
       mReferenceTypeLookUpTable: FunctionOpLookUp,
       mDeclarationsMap: DastDeclarationMap,
       mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild,
       mReferenceType: ObjectType
  ): ContextDeclarationBuild
  {
    const { error, setErrorFn } = StandardError.make();
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

    // need to add the rest of the variables
    

    // need to add the rest of the accessors/modifiers/initial sets
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
})

// after that
// it's grab the preface
// build the lines
// combine
// clean up
// then done
