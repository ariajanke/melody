import { type BuildSink } from './tree_part_build';
import { type TreePartBuild } from './tree_part_build';
import { AstTupleNode } from '../ast_tuple_node';
import { type AstNode } from '../ast_node';
import { type IncompleteNode } from '../ast_incomplete_binary_node';
import { Helpers } from '../helpers';
import { BuildStateRangeSafety } from './build_state_range_safety';

const { freeze } = Helpers;

export interface BuildState extends BuildSink {
  hasRemainingParts: () => boolean,
  popPart: () => TreePartBuild,
  finish: () => AstTupleNode
}

export const BuildState = freeze({
  make: (): BuildState => {
    const mCompleteNodes: AstNode[] = [];
    const mIncompleteNodes: IncompleteNode[] = [];
    const mBuildParts: TreePartBuild[] = [];
    const { verifyRange, noteNodeAddition, resetSafetyCounts } =
      BuildStateRangeSafety.make();

    const inst = freeze({
      pushPart: (buildPart: TreePartBuild) => {
        mBuildParts.push(buildPart);
        verifyRange(buildPart.range());
        return inst;
      },
      pushComplete: (node: AstNode) => {
        while (mIncompleteNodes.length > 0) {
          const last = mIncompleteNodes[mIncompleteNodes.length - 1];
          node = last.finish(node);
          mIncompleteNodes.length--;
        }
        mCompleteNodes.push(node);
        noteNodeAddition();
        return inst;
      },
      pushIncomplete: (node: IncompleteNode) => {
        mIncompleteNodes.push(node);
        return inst;
      },
      hasRemainingParts: () => mBuildParts.length > 0,
      popPart: () => {
        const last = mBuildParts[mBuildParts.length - 1];
        if (!last) { 
          throw Error(`Cannot pop build state, no parts remain`);
        }
        resetSafetyCounts();
        --mBuildParts.length;
        return last;
      },
      finish: (): AstTupleNode =>
        AstTupleNode.make(mCompleteNodes)
    });
    return inst;
  }
});
