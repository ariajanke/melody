import { FunctionNamingSchema } from '../../function_naming_schema';
import { FunctionLookUpTable } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { OperatorNamingSchema } from '../../operator_naming_schema';
import { NameDeclaration } from '../context_base_names_set/declaration_names_retrieval';
import { ContextDeclarationBuild } from '../context_build';
import { TupleObjectType } from '../tuple_object_type';
import { ContextTypeProgression_ } from './context_declaration_build';
import { DeclarationBuildConstructor } from './context_link_stage';
import { UsedAncestorCollection } from './used_ancestor_collection';
import { WritableObjectType } from './writable_object_type';

const { freeze, memoize } = Helpers;

export interface ContextDelegationStage_ {
  next(declarations: Readonly<NameDeclaration[]>,
       progression: ContextTypeProgression_)
    : ContextDeclarationBuild;
};

function make
  (mPendingNames: { [name: string]: true },
   mUsedAncestorCollection: UsedAncestorCollection,
   mWritableReferenceType: WritableObjectType,
   mIntoDeclarationBuild: DeclarationBuildConstructor)
: ContextDelegationStage_
{

  function lookUpName(name: string): FunctionLookUpTable {
    return mUsedAncestorCollection.mapNameToAncestor(name)?.lookUp(name) ??
           raise(`Could not find pending name '${name}'`);
  }

  function checkAndDelegateCallable
    (wobj: WritableObjectType,
     fname: string,
    ): WritableObjectType
  {
    if (!FunctionNamingSchema.isAFringeAccessorName(fname))
      { return wobj; }

    const isCallable = mUsedAncestorCollection.
      mapNameToAncestor(fname)?.
      lookUp(fname)?.
      byParameters(TupleObjectType.emptyTuple())?.
      returns()?.
      lookUp(OperatorNamingSchema.kCall);
    
    if (!isCallable)
      { return wobj; }

    const callname =
      FunctionNamingSchema.mapFromFringeAccessor(fname) ??
      raise('no callname for callable?');
    return wobj.setFunctionLookUp(callname, lookUpName(callname));
  }

  const writableReferenceType = memoize(() =>
    Object.
      keys(mPendingNames).
      reduce((refType: WritableObjectType, name: string) => {
        if (name === FunctionNamingSchema.kParentName)
          { return refType; }
        
        refType = checkAndDelegateCallable(refType, name);
        return refType.setFunctionLookUp(name, lookUpName(name));
      }, mWritableReferenceType));

  function next
    (declarations: Readonly<NameDeclaration[]>,
     progression: ContextTypeProgression_)
  {
    return mIntoDeclarationBuild(declarations, writableReferenceType(), progression);
  }

  return freeze({ next });
}

export const ContextDelegationStage_ = freeze({ make });
