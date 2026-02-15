import {
  DastLetDeclationMany,
  DastLetDeclations,
  DastNode
} from '../dast_build';
import { Helpers, StandardError, StandardErrorMessage } from '../helpers';
import { FunctionTypeBuild, ObjectType } from '../function_type_build';
import { ContextTypeBuilder } from './context_type_builder';
import { Token } from '../token';
import { PutsFunctionLookUpTable } from './puts_function_look_up_table';
import { HoldContextTypeFunction } from './function_type_build_visitor';

const { freeze, memoize } = Helpers;

export interface ContextBuild {
  contextType(): ObjectType | undefined;
  error(): StandardErrorMessage;
}

function make
  (mDefs: DastLetDeclations,
   mIntoFastBuild: (dnode: DastNode) => FunctionTypeBuild,
   mHoldAsContextType: HoldContextTypeFunction,
   mBuilder = ContextTypeBuilder.make())
  : ContextBuild
{
  const { error, setErrorFn, setErrorMessage } = StandardError.make();
  const mInProgressType = mBuilder.objectType;

  function addedAttrsOkay
    (name: string, operator: string, otype: ObjectType): ObjectType | undefined
  {
    const directCallLookUp = otype.lookUp(Token.kCallToken.content());
    if (directCallLookUp) {
      // NOTE: a caller of this will need to check for the accessor for the
      //       call index, as it is made as an indirect call
      mBuilder.addDirectLookUp(name, directCallLookUp);
    }
    switch (operator) {
    case ':=':
      mBuilder.addModifier(name, otype);
      // FALLTHROUGH
    case '=':
      mBuilder.addAccessor(name, otype);
      return mInProgressType();
    default:
      return setErrorMessage(`Operator "${operator}" not valid`);
    }
  }

  function handleNamesOkay
    (specificTupleDef: DastLetDeclationMany,
     tupleType: ObjectType)
    : ObjectType | undefined
  {
    const detupledTypes = tupleType.detuplify();
    const { names, operator } = specificTupleDef;
    if (!detupledTypes || detupledTypes.length !== names.length) {
      setErrorMessage(`Expected tuple type of ${names.length} ` +
                      `element(s) for names`);
      return undefined;
    }
    
    for (let idx = 0; idx < names.length; ++idx) {
      if (!addedAttrsOkay(names[idx], operator, detupledTypes[idx]))
        { return undefined; }
    }
    return mInProgressType();
  }

  const contextType = memoize((): ObjectType | undefined => {
    mBuilder.addDirectLookUp('puts', PutsFunctionLookUpTable.instance());

    return mHoldAsContextType(mInProgressType, () => {
      for (const def of mDefs) {
        const fbuild = mIntoFastBuild(def.value);
        const valueNodeAsFt = fbuild.functionType();
        if (!valueNodeAsFt) {
          return setErrorFn(fbuild.error);
        }
        
        const returnType = valueNodeAsFt.returns();
        if ('name' in def) {
          mBuilder.addInitialSet(def.name, returnType);
          if (!addedAttrsOkay(def.name, def.operator, returnType))
            { return undefined; }
        } else {
          mBuilder.addInitialSet(def.names, returnType);
          if (!handleNamesOkay(def, returnType))
            { return undefined; }
        }
      }

      return mInProgressType();
    });
  });

  return freeze({
    contextType,
    error
  });
}

export const ContextBuild = freeze({ make });
