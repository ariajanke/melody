import { AstNode } from './ast_node';
import { AstIncompleteBinaryNode } from './ast_incomplete_binary_node';
import { TokenCollection } from './tokenization';
import { StandardErrorsFn, TypeCheckable } from './helpers';
import { Token } from './token';
import { PartialTreeStartGroupBuild } from './partial_tree_start_group_build';
import { PartialTreeStartIdentifierBuild } from './partial_tree_start_identifier_build';

const { freeze } = Object;

export interface PartialTreeBuild {
  buildPart: () => NodeExpansion | undefined,
  ignoresNewLines: () => boolean,
  error: StandardErrorsFn
}

export type PartialBuildToNodesFn =
  (partBuild: PartialTreeBuild) => Readonly<AstNode[]>;

export interface NodeExpansion extends TypeCheckable {
  expandIntoNodes(partBuildToNodes: PartialBuildToNodesFn): Readonly<AstNode[]>
}

export const DoNothingCombiner = (() => {
  const { type, hasCreated } = TypeCheckable.make();
  const kEmpty: Readonly<AstNode[]> = [];

  function expandIntoNodes(_0: PartialBuildToNodesFn): Readonly<AstNode[]> {
    return kEmpty;
  }

  const sharedInst = freeze({
    expandIntoNodes,
    type
  });

  function make(): NodeExpansion {
    return sharedInst;
  }

  return freeze({ make, hasCreated });
})();

export const PartialTreeBuild = (() => {
  const tokenTypes = Token.types;

  const lineContinuationScheme = freeze({
    inGroup: Symbol(),
    operatorContinued: Symbol(),
    normal: Symbol()
  });

  const { skipNewLine } = PartialTreeStartGroupBuild;

  function make
    (mTokens: TokenCollection, mStart: number, mEnd: number,
     mLineContScheme: symbol = lineContinuationScheme.normal)
  {
    return construct(mTokens, mStart, mEnd, mLineContScheme);
  }

  function makeAssumeNotNewLine
    (mTokens: TokenCollection, mStart: number, mEnd: number,
     mLineContScheme: symbol)
  {
    return construct(mTokens, mStart, mEnd, mLineContScheme);
  }

  function construct
    (mTokens: TokenCollection, mStart: number, mEnd: number,
     mLineContScheme: symbol): PartialTreeBuild
  {
    let mErrorFn: StandardErrorsFn = () => { return undefined; };

    function _fromGroupStart
      (incompleteNode: AstIncompleteBinaryNode | undefined,
       start: number,
       closeBasedOn: string):
       NodeExpansion | undefined
    {
      const group = PartialTreeStartGroupBuild.
        make(mTokens, incompleteNode, start, mEnd, closeBasedOn);
      const built = group.startGroupBuild();
      if (built) return built;
      mErrorFn = group.error;
      return;
    }

    function ignoresNewLines(): boolean { return mLineContScheme !== lineContinuationScheme.normal; }

    // this is the tippy-top of the chain, anything can happen
    function buildPart(): NodeExpansion | undefined {
      if (mStart === mEnd) {
        return DoNothingCombiner.make();
      }

      const startPos = skipNewLine(mTokens, mStart);
      if (startPos === mEnd) {
        // nothing, but not an error
        return DoNothingCombiner.make();
      }
      const start = mTokens.at(startPos);
      if (start.type() === tokenTypes.identifier ||
          start.type() === tokenTypes.stringLiteral)
      {
        const ptsib = PartialTreeStartIdentifierBuild.
          make(mTokens, startPos, mEnd, mLineContScheme);
        const built = ptsib.build();
        if (built) return built;
        mErrorFn = ptsib.error;
        return;
      } else if (start.content() == '(') {
        // grouping new line ignoring range (processed separately)
        if (startPos + 1 < mEnd) {
          return _fromGroupStart(undefined, startPos, start.content());
        }
        mErrorFn = () => freeze({
          message: 'end of input reached before being able to close'
        });
        return;
      }
      mErrorFn = () => freeze({
        message: 'unimplemented case'
      });
    }

    function error() { return mErrorFn(); }

    return freeze({
      buildPart,
      ignoresNewLines,
      error,
      db: { mLineContScheme, mStart, mEnd }
    });
  }

  return freeze({
    makeAssumeNotNewLine,
    make,
    // kNothing,
    lineContinuationScheme,
    skipNewLine
  });
})();
