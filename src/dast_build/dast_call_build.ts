import { DastBuild } from '../dast_build';
import { Helpers, raise, StandardError } from '../helpers';
import { OperatorNamingSchema } from '../operator_naming_schema';
import { IastNode } from '../iast_node';
import { DastNode_ } from './dast_node';
import { DastCall } from './dast_node_specializations';

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
  if (mCallName === kAssignment) {
    raise('":=" must not appear here!');
  }

  const receiverBuild = memoize(() => mIntoDastBuild(mReceiverNode));

  const argsBuild = memoize(() => mIntoDastBuild(mArgsNode));

  const receiverNode = memoize(() => {
    if (!receiverBuild())
      { return undefined; }

    return receiverBuild()!.node() ?? setErrorFn(receiverBuild()!.error);
  });

  const argsNode = memoize(() =>
    argsBuild().node() ?? setErrorFn(argsBuild().error));

  const node = memoize((): DastNode_ | undefined => {
    if (!receiverNode() || !argsNode())
      { return undefined; }

    return DastCall.make(mCallName, receiverNode()!, argsNode()!);
  });

  return freeze({ node, error });
}

export const DastCallBuild = freeze({ make });
