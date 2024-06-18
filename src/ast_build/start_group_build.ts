import { Helpers } from '../helpers';
import { type Token } from '../token';
import { type TokenRange } from '../token_range';
import { BuildSink, BuildStateAddition, TreePartBuild } from './tree_part_build';
import { ClosePositionRetrieval } from './close_position_retrieval';
import { IncompleteNode } from '../ast_incomplete_binary_node';

const { freeze, memoize } = Helpers;

export const StartGroupBuild = freeze({
  makeBuildAdditionWithIncomplete:
    (mTokenRange: TokenRange,
     mGroupOpen: Token,
     mIncompleteNode: IncompleteNode) =>
  {
    if (mTokenRange.isEmpty()) {
      throw Error('must check for empty range');
    }
    const nextPart = StartGroupBuild.make(mTokenRange, mGroupOpen);
    return BuildStateAddition.make((sink: BuildSink) => {
      sink.
        pushIncomplete(mIncompleteNode).
        pushPart(nextPart);
    });
  },
  // assumption: token range starts one after the group open token
  make: (mTokenRange: TokenRange, mGroupOpen: Token): TreePartBuild => {
    const {
      error, closePosition
    } = ClosePositionRetrieval.make(mTokenRange, mGroupOpen);
    const { start, end } = mTokenRange;

    const leftPartRange = () =>
      mTokenRange.clone(start(), closePosition() as number);

    const rightPartStart = () =>
      Math.min(closePosition() as number + 1, end());

    const rightPartRange = memoize(() =>
      mTokenRange.clone(rightPartStart(), end()).skipNewLine());

    const makePart = TreePartBuild.make;

    return freeze({
      build: (): BuildStateAddition | undefined => {
        if (!closePosition()) return;
        // NOTE empty creates an empty tuple node
        const leftPart = makePart(leftPartRange());
        return BuildStateAddition.make((sink: BuildSink) => {
          // NOTE order dependant
          if (!rightPartRange().isEmpty()) {
            sink.pushPart(makePart(rightPartRange()));
          }
          sink.pushPart(leftPart);
        });
      },
      error,
      range: mTokenRange.range
    });
  }
});
