import { FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { ContextFactoryStage, ContextFunctionTypeBuild } from './context_factory_stage';
import { Helpers, raise, StandardError } from '../helpers';
import { FunctionNamingSchema } from '../function_naming_schema';
import { TupleObjectFactory } from './tuple_type';

const { freeze, memoize } = Helpers;

// I need a way to look up a context's name, and add it as an accessor on the
// current context. Unlike variable methods which require space on the stack
// frame, this is just a linked list traversal.

const InterveningFrameThing = freeze({
  make(mStage: ContextFactoryStage,): ContextFunctionTypeBuild {

  }
});

function make
  (mPendingName: string,
   mStage: ContextFactoryStage,
   mParentContextType?: ObjectType
  // I need to track intervening frames
  )
  : ContextFunctionTypeBuild
{
  const { error, setErrorMessage } = StandardError.make();
  const parentFunctionLookUp = memoize(() =>
    mParentContextType?.lookUp(mPendingName));

  // for each ftype in parentFunctionLookUp,
  // map to appropriate ftypes
  // each ftype may have an "alternateReceiver"...

  parentFunctionLookUp()?.list().forEach((ftype: FunctionType) => {
    if (!mParentContextType) {
      raise('no');
    }
    // if we follow lexical, let's error out
    let receivedBy = ftype.alternateReceiver();
    if (!receivedBy) {
      return setErrorMessage('not handling lexical only receiver');
    }
    if (receivedBy === FunctionNamingSchema.kContextName) {
      receivedBy = FunctionNamingSchema.kParentName;
    }
    const obj = mStage.intoObjectType();
    const recFType = obj.lookUp(receivedBy)?.byParameters(TupleObjectFactory.emptyTuple());
    if (!recFType) {
      // now we just need a concept of adding that other context as a regular
      // "hidden" variable for this context
      //
      // It will define:
      // - an accessor
      // - an initial set (mmm, I do like "initializer" better)
      //
      // initial set:
      // - make n-hops up frames
      // - make sure the <parent> variable is declared for each context up
      //   that chain, so we can be sure that those pointers exist
      // - needs to be emitted as part of the function body (for the context)
      // 
      // accessor:
      // - just a dumb accessor, KISS
      obj.intoFactoryStage().intoAccessorBuild(receivedBy, )
    }
    // following we'll either have built that needed receiver or error out
    // once that's done, in order to properly delegate, we need to set an
    // alternate receiver to the parent iff the original alternate was the
    // context

    // here we "transform" the ftype into something appropriate for this context
    const transformedFType = freeze({
      ...ftype,
      alternateReceiver: () => receivedBy
    });

    // we add the transformed ftype to our look up table
    mStage.intoDirectLookUp(mPendingName, {
      list: () => [transformedFType],
      byParameters: (type: ObjectType) => {
        if (ftype.parameters()?.uid() === type.uid()) {
          return transformedFType;
        }
      }
    });
  });
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

  // how do I recurse here?
  const grandParentObject = mParentContextType?.
    lookUp(FunctionNamingSchema.kParentName)?.
    byParameters(TupleObjectFactory.emptyTuple())?.
    returns();
  // then continue on grand parent
  // By DAST pending names schema, there will be a "<parent>" on intervening
  // frames. So those frames should have a "<parent>" created on them by the
  // time we get here (done in ContextBuild).

  return freeze({
  });
}

