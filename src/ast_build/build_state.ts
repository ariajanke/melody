import { type TreePartBuild } from './tree_part_build';
import { AstNode } from '../ast_node';
import { Helpers } from '../helpers';
import { Token } from '../token';
import { BlockBuilder } from './block_builder';

const { freeze } = Helpers;

export const BuildState = freeze({
  make:
    (mErrors: Readonly<{ message: string }>[] = []) =>
  {
    const mBuildParts: TreePartBuild[] = [];
    const mBlockBuilder = BlockBuilder.make(mErrors);
    const inst = freeze({
      hasRemainingParts: () => mBuildParts.length > 0,
      pushPart: (buildPart: TreePartBuild) => {
        mBuildParts.push(buildPart);
        return inst;
      },
      popPart: () =>
        mBuildParts.pop() ?? (() => { throw new Error('no parts remain'); })(),
      pushToken: (token: Token, operandRelation: string) => {
        mBlockBuilder.pushToken(token, operandRelation);
        return inst;
      },
      pushNode: (node: AstNode) => {
        mBlockBuilder.pushNode(node);
        return inst;
      },
      pushStatement: () => {
        mBlockBuilder.pushStatement();
        return inst;
      },
      popStatement: (fn: (node: AstNode) => AstNode | undefined) => {
        mBlockBuilder.popStatement(fn);
        return inst;
      },
      pushNewLine: () => {
        mBlockBuilder.pushNewLine();
        return inst;
      },
      complete: () => mBlockBuilder.complete()
    });
    return inst;
  }
});
export type BuildState = ReturnType<typeof BuildState.make>;
