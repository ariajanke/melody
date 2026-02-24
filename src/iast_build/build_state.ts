import { type BuildSink, type TreePartBuild } from './tree_part_build';
import { Helpers } from '../helpers';
import { Token } from '../token';
import { BlockBuilder } from './block_builder';
import { IastNode } from '../iast_node';

const { freeze } = Helpers;

export interface BuildState {
  hasRemainingParts: () => boolean,
  pushPart: (buildPart: TreePartBuild) => BuildState,
  popPart: () => TreePartBuild,
  pushToken: (token: Token, operandRelation: string) => BuildState,
  pushNode: (node: IastNode) => BuildState,
  pushStatement: () => BuildState,
  popStatement: (fn: (node: IastNode) => IastNode | undefined) => BuildState,
  pushNewLine: () => BuildState,
  pushBlock: () => BuildState,
  popBlock: (fn: (node: IastNode) => IastNode | undefined) => BuildState,
  complete: () => IastNode,
  asString: () => string
};

export const BuildState = freeze({
  make:
    (mErrors: Readonly<{ message: string }>[] = []) =>
  {
    const mBuildParts: TreePartBuild[] = [];
    const mBlockBuilders: BlockBuilder[] = [BlockBuilder.make(mErrors)];
    const throwNoRemainingBuilders = () =>
      { throw new Error('no remaining block builders'); };
    const lastBlockBuilder = () =>
      mBlockBuilders[mBlockBuilders.length - 1] ??
      throwNoRemainingBuilders();
    const pushBlock = (): BuildState => {
      mBlockBuilders.push(BlockBuilder.make(mErrors));
      return inst;
    };
    const popBlock = (fn: (node: IastNode) => IastNode | undefined) => {
      const lastBuilder = mBlockBuilders.pop() ?? throwNoRemainingBuilders();
      const node = fn( lastBuilder.complete() );
      if (node) {
        inst.pushNode(node);
      }
      return inst;
    };
    const inst = freeze({
      hasRemainingParts: () => mBuildParts.length > 0,
      pushPart: (buildPart: TreePartBuild): BuildState =>
        (mBuildParts.push(buildPart) && inst) as BuildState,
      popPart: () => {
        return mBuildParts.pop() ?? (() => { throw new Error('no parts remain'); })();
      },
      pushToken: (token: Token, operandRelation: string) =>
        lastBlockBuilder().pushToken(token, operandRelation) && inst,
      pushNode: (node: IastNode) =>
        lastBlockBuilder().pushNode(node) && inst,
      pushStatement: () =>
        lastBlockBuilder().pushStatement() && inst,
      popStatement: (fn: (node: IastNode) => IastNode | undefined) =>
        lastBlockBuilder().popStatement(fn) && inst,
      pushNewLine: () =>
        lastBlockBuilder().pushNewLine() && inst,
      pushBlock,
      popBlock,
      complete: () => lastBlockBuilder().complete(),
      asString: () => {
        let s = `(Blocks ${mBlockBuilders.length}, Statements ${lastBlockBuilder().statementCount()})`;
        mBuildParts.forEach((part: TreePartBuild) => {
          s = `${s} {${part.asString()}}`;
        });
        return s;
      }
    });
    return inst satisfies BuildSink;
  }
});
