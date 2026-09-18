import { FunctionNamingSchema } from '../../function_naming_schema';
import { Helpers, StandardError } from '../../helpers';
import { AstNode } from '../../ast_node';
import { Token } from '../../token';
import { StripBuild, StripBuildResult } from './strip_build';

const { freeze, memoize } = Helpers;

const { mapToFringeAccessor } = FunctionNamingSchema;

const {
  tokenize,
  makeCall,
  emptyTupleInstance
} = AstNode.forOperatorStripping;

function make
  (mRecurseOn: (n: AstNode) => AstNode | undefined,
   mOriginalCallName: Token,
   mReceiver: AstNode,
   mArgs: AstNode)
  : StripBuild
{
  const { error, setErrorMessage } = StandardError.make();
  const idName = () =>
    tokenize(mArgs) ??
    setErrorMessage(`Token following (${mOriginalCallName.end()}) must be an identifier`);

  const callName = memoize((): Token | undefined => {
    const name = idName();
    if (name === undefined)
      { return undefined; }

    return freeze({
      start  : mOriginalCallName.start,
      end    : name.end,
      content: memoize(() => mapToFringeAccessor(name.content())),
      type   : name.type
    });
  });

  const node = memoize((): StripBuildResult => {
    if (!callName())
      { return undefined; }

    const rec = mRecurseOn(mReceiver);
    if (!rec)
      { return undefined; }

    
    return makeCall(callName()!, rec, emptyTupleInstance());
  });

  return freeze({ node, error });
}

export const DotStripBuild = freeze({ make });
