import { DastBuild } from '../dast_build';
import { Helpers, StandardError } from '../helpers';
import { OperatorNamingSchema } from '../operator_naming_schema';
import { IastNode } from '../iast_node';
import { DastNode_ } from './dast_node';
import { DastCall } from './dast_node_specializations';
import { ReceiverAssignmentStripping } from './receiver_assignment_stripping';

const { freeze, memoize } = Helpers;

function make
  (mCallName: string,
   mIntoDastBuild: (n: IastNode) => DastBuild,
   mReceiverNode: IastNode,
   mArgsNode: IastNode)
  : DastBuild
{
  const { error, setErrorFn } = StandardError.make();
  const { kAssignment } = OperatorNamingSchema;

  const assignmentStripping = memoize((): ReceiverAssignmentStripping | undefined => {
    if (mCallName === kAssignment)
      { return ReceiverAssignmentStripping.make(mReceiverNode); }

    return undefined;
  });

  const adjustedReceiver = memoize(() => {
    if (assignmentStripping()) {
      return assignmentStripping()!.strippedTree() ??
             setErrorFn(assignmentStripping()!.error);
    }

    return mReceiverNode;
  });

  const receiverBuild = memoize(() => {
    if (!adjustedReceiver())
      { return undefined; }

    return mIntoDastBuild(adjustedReceiver()!);
  });

  const argsBuild = memoize(() => mIntoDastBuild(mArgsNode));

  const callName = memoize(() => {
    if (assignmentStripping()) {
      const token = assignmentStripping()!.nameTarget();
      if (!token)
        { return undefined; }

      return `${token.content()}${mCallName}`;
    }

    return mCallName;
  });

  const receiverNode = memoize(() => {
    if (!receiverBuild())
      { return undefined; }

    return receiverBuild()!.node() ?? setErrorFn(receiverBuild()!.error);
  });

  const argsNode = memoize(() =>
    argsBuild().node() ?? setErrorFn(argsBuild().error));

  const node = memoize((): DastNode_ | undefined => {
    if (!callName() || !receiverNode() || !argsNode())
      { return undefined; }

    return DastCall.make(callName()!, receiverNode()!, argsNode()!);
  });

  return freeze({ node, error });
}

export const DastCallBuild = freeze({ make });
