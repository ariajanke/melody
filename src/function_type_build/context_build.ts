import {
  DastDeclarationMap,
  DastLetDeclaration,
  DastNode
} from '../dast_build';
import { Helpers, StandardError, StandardErrorMessage } from '../helpers';
import { FunctionTypeBuild, ObjectType } from '../function_type_build';
import { ContextTypeBuilder } from './context_type_builder';
import { PutsFunctionLookUpTable } from './puts_function_look_up_table';
import { HoldContextTypeFunction } from './function_type_build_visitor';

const { freeze, memoize } = Helpers;

export interface ContextBuild {
  contextType(): ObjectType | undefined;
  error(): StandardErrorMessage;
}

const ContextBuildPerDeclaration = freeze({
  make(mFunctionName: string,
       mDef: DastLetDeclaration,
       mIntoFastBuild: (dnode: DastNode) => FunctionTypeBuild,
       mBuilder: ContextTypeBuilder): FunctionTypeBuild
  {
    const { error, setErrorFn } = StandardError.make();

    const typeForDef = memoize((): ObjectType | undefined => {
      const fbuild = mIntoFastBuild(mDef.value);
      const valueNodeAsFt = fbuild.functionType();
      if (!valueNodeAsFt) {
        return setErrorFn(fbuild.error);
      }
      return valueNodeAsFt.returns();
    });

    const functionType = memoize(() => {
      if (!typeForDef())
        { return undefined; }
      if (mDef.functionKind === 'assignment') {
        return mBuilder.addModifier(mFunctionName, typeForDef()!);
      } else if (mDef.functionKind === 'accessor') {
        return mBuilder.addAccessor(mFunctionName, typeForDef()!);
      }

      if (!mDef.variableNames || mDef.functionKind !== 'initialSet') {
        throw new Error(`Expected variable names for initialSet declaration of ` +
                        `"${mFunctionName}", on kind "${mDef.functionKind}"`);
      }
      const fbuild = mBuilder.
        addInitialSet(mFunctionName, mDef.variableNames, typeForDef()!);

      return fbuild.functionType() ?? setErrorFn(fbuild.error);
    });

    return freeze({ functionType, error });
  }
});

function make
  (mDefs: DastDeclarationMap,
   mIntoFastBuild: (dnode: DastNode) => FunctionTypeBuild,
   mHoldAsContextType: HoldContextTypeFunction,
   mBuilder = ContextTypeBuilder.make())
  : ContextBuild
{
  const { error, setErrorFn } = StandardError.make();
  const mInProgressType = mBuilder.objectType;

  // function addedAttrsOkay
  //   (name: string, operator: string, otype: ObjectType): ObjectType | undefined
  // {
  //   const directCallLookUp = otype.lookUp(Token.kCallToken.content());
  //   if (directCallLookUp) {
  //     // NOTE: a caller of this will need to check for the accessor for the
  //     //       call index, as it is made as an indirect call
  //     mBuilder.addDirectLookUp(name, directCallLookUp);
  //   }
  //   switch (operator) {
  //   case kAssignmentOperator:
  //     mBuilder.addModifier(name, otype);
  //     // FALLTHROUGH
  //   case '=':
  //     mBuilder.addAccessor(name, otype);
  //     return mInProgressType();
  //   default:
  //     return setErrorMessage(`Operator "${operator}" not valid`);
  //   }
  // }

  // function handleNamesOkay
  //   (specificTupleDef: DastLetDeclarationMany,
  //    tupleType: ObjectType)
  //   : ObjectType | undefined
  // {
  //   const detupledTypes = tupleType.detuplify();
  //   const { names, operator } = specificTupleDef;
  //   if (!detupledTypes || detupledTypes.length !== names.length) {
  //     setErrorMessage(`Expected tuple type of ${names.length} ` +
  //                     `element(s) for names`);
  //     return undefined;
  //   }
    
  //   for (let idx = 0; idx < names.length; ++idx) {
  //     if (!addedAttrsOkay(names[idx], operator, detupledTypes[idx]))
  //       { return undefined; }
  //   }
  //   return mInProgressType();
  // }
  // const mVariableTracker = VariableTracker.make();
  // const {
  //   ensureVariablePresence,
  //   talliedSizeInBytes,
  //   talliedSizeInItems
  // } = mVariableTracker;
  
  // const mLookUpTable:
  //   { [op: string | symbol]: FunctionLookUpTable | undefined } = {};

  // const kPerOperator = freeze({
  //   [kAssignmentOperator]: (def: DastLetDeclaration, returnType: ObjectType) => {
  //        const { type, accessIndex } = ensureVariablePresence(name, definedBy);
  //         const { emptyTuple } = TupleObjectFactory;
  //         const fType = ContextAttributeFactory.buildGetter(accessIndex, type);
  //         mLookUpTable[mapToFringeAccessor(name)] = MutableFunctionTable.
  //           make().
  //           setDefinition(emptyTuple(), fType);
  //         return fType;
  //   },
  //   [kEqualityOperator]: (def: DastLetDeclaration, returnType: ObjectType) => {
  //   },
  //   'initialSet': (def: DastLetDeclaration, returnType: ObjectType) => {
  //   }
  // });

  // function getTypeForDef(def: DastLetDeclaration): ObjectType | undefined {
  //   const fbuild = mIntoFastBuild(def.value);
  //   const valueNodeAsFt = fbuild.functionType();
  //   if (!valueNodeAsFt) {
  //     return setErrorFn(fbuild.error);
  //   }
  //   return valueNodeAsFt.returns();
  // }

  // const kPerKind = freeze({
  //   'assignment': (functionName: string, def: DastLetDeclaration): FunctionType | undefined => {
  //     const returnType = getTypeForDef(def);
  //     if (!returnType)
  //       { return undefined; }
  //     return mBuilder.addModifier(functionName, returnType);
  //   },
  //   'accessor': (functionName: string, def: DastLetDeclaration) => {
  //     const returnType = getTypeForDef(def);
  //     if (!returnType)
  //       { return undefined; }
  //     return mBuilder.addAccessor(functionName, returnType);
  //   },
  //   'initialSet': (functionName: string, def: DastLetDeclaration) => {
  //     const returnType = getTypeForDef(def);
  //     if (!returnType)
  //       { return undefined; }
  //     if (!def.variableNames) {
  //       throw new Error(`Expected variable names for initialSet declaration of ` +
  //                       `"${functionName}"`);
  //     }
  //     const fbuild = mBuilder.
  //       addInitialSet(functionName, def.variableNames, returnType);
  //     return fbuild.functionType() ?? setErrorFn(fbuild.error);
  //   }
  // });

  const contextType = memoize((): ObjectType | undefined => {
    mBuilder.addDirectLookUp('puts', PutsFunctionLookUpTable.instance());

    return mHoldAsContextType(mInProgressType, () => {
      for (const functionName in mDefs) {
        // thankfully these builds are cached :)
        const decl = mDefs[functionName];
        // const dastNode: DastNode = decl.value;
        // const fbuild = mIntoFastBuild(dastNode);
        // const valueNodeAsFt = fbuild.functionType();
        // if (!valueNodeAsFt) {
        //   return setErrorFn(fbuild.error);
        // }
        // const returnType = valueNodeAsFt.returns();

        // switch (decl.functionKind) {
        // case 'assignment':
        //   mBuilder.addModifier(functionName, returnType);
        //   break;
        // case 'accessor':
        //   mBuilder.addAccessor(functionName, returnType);
        //   break;
        // case 'initialSet':
        //   if (!decl.variableNames) {
        //     throw new Error(`Expected variable names for initialSet declaration of ` +
        //                     `"${functionName}"`);
        //   }
        //   mBuilder.addInitialSet(functionName, decl.variableNames, returnType);
        //   break;
        // default:
        //   throw new Error(`bad branch`);
        // }
        // kPerKind[decl.functionKind](functionName, decl);

        const declaration = ContextBuildPerDeclaration.
          make(functionName, decl, mIntoFastBuild, mBuilder);
        if (!declaration.functionType()) {
          return setErrorFn(declaration.error);
        }
      }
      // for (const functionName in mDefs.) {
      //   const def = mDefs[functionName];
        
      //   const fbuild = mIntoFastBuild(def.value);
      //   const valueNodeAsFt = fbuild.functionType();
      //   if (!valueNodeAsFt) {
      //     return setErrorFn(fbuild.error);
      //   }

      //   const returnType = valueNodeAsFt.returns();
      //   switch (def.operator) {
      //   case kAssignmentOperator:
      //     mBuilder.addModifier(functionName, returnType);
      //     break;
      //   case '=':
      //     mBuilder.addAccessor(functionName, returnType);
      //     break;
      //   case 'initialSet':
      //     // we'll handle this in the next loop, as we need to know the return type
      //     mBuilder.addInitialSet(functionName, returnType);
      //     break;
      //   default:
      //     throw new Error(`bad branch`);
      //   }
      // }
      // for (const def of mDefs) {
      //   const fbuild = mIntoFastBuild(def.value);
      //   const valueNodeAsFt = fbuild.functionType();
      //   if (!valueNodeAsFt) {
      //     return setErrorFn(fbuild.error);
      //   }
        
      //   const returnType = valueNodeAsFt.returns();
        
      //   if ('name' in def) {
      //     mBuilder.addInitialSet(def.name, returnType);
      //     if (!addedAttrsOkay(def.name, def.operator, returnType))
      //       { return undefined; }
      //   } else {
      //     mBuilder.addInitialSet(def.names, returnType);
      //     if (!handleNamesOkay(def, returnType))
      //       { return undefined; }
      //   }
      // }

      return mInProgressType();
    });
  });

  return freeze({
    contextType,
    error
  });
}

export const ContextBuild = freeze({ make });
