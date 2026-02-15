import { DastBuild, DastNode } from '../dast_build';
import { Helpers, StandardError } from '../helpers';
import { DastBuildBase } from './dast_build_base';
import { DastNode_ } from './dast_node';
import { DastCall } from './dast_node_specializations';
import { ReceiverAssignmentStripping } from './receiver_assignment_stripping';

const { freeze, memoize } = Helpers;

function make
  (mCallBuild: DastBuild,
   mReceiverBuild: DastBuild,
   mArgsBuild: DastBuild)
{
  const { error, setErrorFn } = StandardError.make();
  const node = memoize((): DastNode | undefined => {
    let mCall = mCallBuild.node();
    if (!mCall)
      { return setErrorFn(mCallBuild.error); }
    let mReceiver = mReceiverBuild.node();
    if (!mReceiver)
      { return setErrorFn(mReceiverBuild.error); }

    if (mCall.asString() === ':=') {
      const { nameTarget, interior, error } = ReceiverAssignmentStripping.
        make(mReceiver);
      const nameTarget_ = nameTarget();
      const interior_ = interior();
      if (!nameTarget_ || !interior_) {
        return setErrorFn(error);
      }
      mCall = DastNode_.makeFringe(nameTarget_);
      mReceiver = interior_;
    }

    const mArgs = mArgsBuild.node();
    if (!mArgs)
      { return setErrorFn(mArgsBuild.error); }

    return DastCall.make(mCall, mReceiver, mArgs);
  });

  return freeze({
    ...DastBuildBase.defaultImplementations(),
    node,
    error
  });
}

export const DastCallBuild = freeze({ make });
