import { Helpers, StandardError } from '../../helpers';
import { IastNode } from '../../iast_node';
import { Token } from '../../token';
import { StripBuild, StripBuildResult } from './strip_build';

const { freeze, memoize } = Helpers;

const kTransformCall = (contentFn: () => string) => contentFn;

function make
  (mRecurseOn: (n: IastNode) => IastNode | undefined,
   mOriginalCallName: Token,
   mReceiver: IastNode,
   mArgs: IastNode)
  : StripBuild
{
  const mStripping = StripBuild.
    makeBaseNameStripping(mOriginalCallName, mReceiver, kTransformCall);

  const node = memoize((): StripBuildResult => {
    // NOTE call stripping is optional
    if (!mStripping.nameTarget() || !mStripping.strippedTree()) {
      return 'not-modified';
    }

    const callName = mStripping.nameTarget()!;
    const receiver = mRecurseOn(mStripping.strippedTree()!);
    const args = mRecurseOn(mArgs);
    if (receiver === undefined || args === undefined)
      { return undefined; }

    return IastNode.forOperativeStatements.
      makeCall(callName, receiver, args);
  });

  return freeze({
    node,
    error: () => StandardError.make().error()
  });
}

export const CallStripBuild = freeze({ make });
