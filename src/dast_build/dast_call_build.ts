import { DastBuild } from '../dast_build';
import { FunctionNamingSchema } from '../function_naming_schema';
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
  const callNode = memoize(() =>
    mCallBuild.node() ?? setErrorFn(mCallBuild.error));

  const receiverNode = memoize(() =>
    mReceiverBuild.node() ?? setErrorFn(mReceiverBuild.error));

  const argsNode = memoize(() =>
    mArgsBuild.node() ?? setErrorFn(mArgsBuild.error));

  const assignmentStripping = memoize((): ReceiverAssignmentStripping | undefined => {
    const callNode_ = callNode();
    const receiverNode_ = receiverNode();
    const isAssignmentOperator =
      callNode_?.asString() === FunctionNamingSchema.kAssignmentOperator;
    if (callNode_ && receiverNode_ && isAssignmentOperator)
      { return ReceiverAssignmentStripping.make(receiverNode_); }
    return undefined;
  });

  const nodeAsAnAssignment = (() => {
    if (!assignmentStripping())
      { return undefined; }

    const { nameTarget, interior, error } = assignmentStripping()!;
    if (!(nameTarget() ?? interior()))
      { return setErrorFn(error); }

    const fringe = DastNode_.makeFringe(nameTarget()!);
    return DastCall.make(fringe, interior()!, argsNode()!);
  });

  const nodeAsACall = (() => {
    if (!(callNode() ?? receiverNode() ?? argsNode()))
      { return undefined; }

    return DastCall.make(callNode()!, receiverNode()!, argsNode()!);
  });

  const node = memoize(() => nodeAsAnAssignment() ?? nodeAsACall());

  return freeze({
    ...DastBuildBase.defaultImplementations(),
    node,
    error
  });
}

export const DastCallBuild = freeze({ make });
