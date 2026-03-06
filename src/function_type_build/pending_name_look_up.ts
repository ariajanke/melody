import { FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { ContextFactoryStage, ContextFunctionTypeBuild } from './context_factory_stage';
import { Helpers, raise } from '../helpers';
import { FunctionNamingSchema } from '../function_naming_schema';

const { freeze, memoize } = Helpers;

// I need a way to look up a context's name, and add it as an accessor on the
// current context. Unlike variable methods which require space on the stack
// frame, this is just a linked list traversal.

function make
  (mPendingName: string,
   mStage: ContextFactoryStage,
   mParentContextType?: ObjectType)
  : ContextFunctionTypeBuild
{
  const parentFunctionLookUp = memoize(() =>
    mParentContextType?.lookUp(mPendingName));

  // for each ftype in parentFunctionLookUp,
  // map to appropriate ftypes
  // each ftype may have an "alternateReceiver"...

  const forFType = (ftype: FunctionType) => {
    if (!mParentContextType) {
      raise('no');
    }
    let receivedBy = ftype.alternateReceiver();
    if (receivedBy === FunctionNamingSchema.kContextName) {
      receivedBy = mParentContextType.name();
    }
    // if "receivedBy" not found in current context, then add it
    // once that's done, in order to properly delegate, we need to set an alternate receiver to the parent iff the original alternate was the context
  };
  // we must ensure proper delegation
  // consider call of:
  // <parent>.f(a) for any call of "f" on <context>
  //
  // rec = <context>
  // args = (a)
  // call = "f"
  // inside delegation:
  //   it's too late to change receiver, it's buried by the args
  // 
  // What if we had a destinction between a "lexical" receiver and 
  // an actual receiver?
  // What the actual receiver is depends on the:
  // - look up table?
  // - actual function type?
  //
  // The lexical receiver tells us what the function type is
  // but the actual receiver is the function type of our "hidden" parameter
  //
  // The actual receiver is a function type retrieved from the same place as our call.
  //
  // Some actual receivers maybe:
  // - some other context type (<parent> or <grandparent>)
  // - the context itself (<context>)
  // - no receiver at all (<none> e.g. for "puts")

  // *now* I should be able to create function types which are "delegates" to any
  // other context

  return freeze({
  });
}

