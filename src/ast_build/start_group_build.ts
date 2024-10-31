import { Helpers, StandardErrorMessage } from '../helpers';
import { Token } from '../token';
import { type TokenRange } from '../token_range';
import { BuildSink, BuildStateAddition, TreePartBuild } from './tree_part_build';
import { ClosePositionRetrieval } from './close_position_retrieval';
import { type AstNode } from '../ast_node';
import { ContinuingAfterFringeBuild } from './continuing_after_fringe_build';

const { freeze, memoize } = Helpers;

const CloseGroupPart = freeze({
  make: (mTokenRange: TokenRange): TreePartBuild =>
    freeze({
      build: () =>
        BuildStateAddition.make((sink: BuildSink) => {
          sink.popGrouping((node: AstNode) => {
            if (mTokenRange.isEmpty()) {
              return node;
            }
            sink.pushPart(ContinuingAfterFringeBuild.make(mTokenRange, node));
            return undefined;
          });
        }),
      error: (): StandardErrorMessage => { throw new Error('should not ever fail') },
      range: mTokenRange.range
    })
});

export const StartGroupBuild = freeze({
  passBuildSink: (sink: BuildSink) => sink,
  // assumption: token range starts one after the group open token
  make: (mTokenRange: TokenRange,
         mGroupOpen: Token,
         mOnNewGroupingFn: (sink: BuildSink) => BuildSink = StartGroupBuild.passBuildSink):
         TreePartBuild =>
  {
    if (mGroupOpen.type() !== Token.types.grouping) {
      throw Error(`Group opening must be a grouping tag.`);
    }
    
    const {
      error, closePosition
    } = ClosePositionRetrieval.make(mTokenRange.clone(), mGroupOpen);
    const { start, end } = mTokenRange;

    const leftPartRange = () =>
      mTokenRange.clone(start(), closePosition() as number);

    const rightPartStart = () =>
      Math.min(closePosition() as number + 1, end());

    const rightPartRange = memoize(() =>
      mTokenRange.clone(rightPartStart(), end()));

    const makePart = TreePartBuild.make;

    return freeze({
      build: (): BuildStateAddition | undefined => {
        if (!closePosition()) return;

        // NOTE empty creates an empty tuple node
        const leftPart  = makePart(leftPartRange());
        const rightPart = CloseGroupPart.make(rightPartRange());
        return BuildStateAddition.make((sink: BuildSink) => {
          // NOTE order dependant
          mOnNewGroupingFn(sink.pushGrouping()).
            pushPart(rightPart).
            pushPart(leftPart);
        });
      },
      error,
      range: mTokenRange.range
    });
  }
});
