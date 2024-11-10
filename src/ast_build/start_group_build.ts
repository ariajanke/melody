import { Helpers, StandardErrorMessage } from '../helpers';
import { Token } from '../token';
import { type TokenRange } from '../token_range';
import { BuildSink, BuildStateAddition, TreePartBuild } from './tree_part_build';
import { ClosePositionRetrieval } from './close_position_retrieval';
import { type AstNode } from '../ast_node';
import { ContinuingAfterSingleValueBuild } from './continuing_after_single_value_build';

const { freeze, memoize } = Helpers;

const CloseGroupPart = freeze({
  make: (mTokenRange: TokenRange): TreePartBuild =>
    freeze({
      build: () =>
        BuildStateAddition.make((sink: BuildSink) => {
          sink.popStatement((node: AstNode) => {
            if (mTokenRange.isEmpty()) {
              return node;
            }
            sink.pushPart(ContinuingAfterSingleValueBuild.make(mTokenRange, node));
            return undefined;
          });
        }),
      error: (): StandardErrorMessage => { throw new Error('should not ever fail'); },
      range: mTokenRange.range,
      asString: () => `CGP ${mTokenRange.asString()}`
    })
});

const passBuildSink = (sink: BuildSink) => sink;

const GroupBuildSplit = freeze({
  make:
    (mClosePosition: number,
     mTokenRange: TokenRange,
     mOnNewGroupingFn: (sink: BuildSink) => BuildSink = passBuildSink) =>
  {
    const { start, end, clone } = mTokenRange;

    const leftPartRange = () => clone(start(), mClosePosition);

    const rightPartStart = () =>
      Math.min(mClosePosition + 1, end());

    const rightPartRange = () => clone(rightPartStart(), end());

    return freeze({
      build: memoize((): BuildStateAddition => {
        // NOTE empty creates an empty tuple node
        const leftPart  = TreePartBuild .make(leftPartRange ());
        const rightPart = CloseGroupPart.make(rightPartRange());
        return BuildStateAddition.make((sink: BuildSink) => {
          // NOTE order dependant
          mOnNewGroupingFn(sink.pushStatement()).
            pushPart(rightPart).
            pushPart(leftPart);
        });
      })
    });
  }
});

export const StartGroupBuild = freeze({
  passBuildSink,
  // assumption: token range starts one after the group open token
  make: (mTokenRange: TokenRange,
         mGroupOpen: Token,
         mOnNewGroupingFn: (sink: BuildSink) => BuildSink = passBuildSink):
         TreePartBuild =>
  {
    if (mGroupOpen.type() !== Token.types.grouping) {
      throw Error(`Group opening must be a grouping tag.`);
    }
    
    const {
      error, closePosition
    } = ClosePositionRetrieval.make(mTokenRange.clone(), mGroupOpen);

    return freeze({
      build: (): BuildStateAddition | undefined => {
        return (closePosition() &&
                  GroupBuildSplit.
                    make(closePosition() as number, mTokenRange, mOnNewGroupingFn).
                    build()) as BuildStateAddition | undefined;
      },
      error,
      range: mTokenRange.range,
      asString: () => `SGB ${mTokenRange.asString()}`
    });
  }
});
