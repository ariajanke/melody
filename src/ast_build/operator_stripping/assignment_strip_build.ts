import { Helpers } from '../../helpers';
import { AstNode } from '../../ast_node';
import { OperatorNamingSchema } from '../../operator_naming_schema';
import { Token } from '../../token';
import { StripBuild } from './strip_build';

const { freeze, memoize } = Helpers;

const kTransformOfAssignment = (contentFn: () => string) =>
  () => `${contentFn()}${OperatorNamingSchema.kAssignment}`;

function make
  (mRecurseOn: (n: AstNode) => AstNode | undefined,
   mOriginalCallName: Token,
   mReceiver: AstNode,
   mArgs: AstNode)
  : StripBuild
{
  const mStripping = StripBuild.
    makeBaseNameStripping(mOriginalCallName, mReceiver, kTransformOfAssignment);

  const node = memoize(() => {
    // NOTE assignment stripping is mandatory
    if (!mStripping.nameTarget() || !mStripping.strippedTree())
      { return undefined; }

    const callName = mStripping.nameTarget()!;
    const receiver = mRecurseOn(mStripping.strippedTree()!);
    const args = mRecurseOn(mArgs);
    if (receiver === undefined || args === undefined)
      { return undefined; }

    return AstNode.forOperatorStripping.makeCall(callName, receiver, args);
  });

  return freeze({
    node,
    error: mStripping.error
  });
}

export const AssignmentStripBuild = freeze({ make });
