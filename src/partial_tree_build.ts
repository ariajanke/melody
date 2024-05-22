import { TokenCollection } from './tokenization';
import { Helpers, StandardErrorsFn } from './helpers';
import { Token } from './token';
import { PartialTreeStartGroupBuild } from './partial_tree_start_group_build';
import { PartialTreeStartIdentifierBuild } from './partial_tree_start_identifier_build';
import { NodeExpansion, EmptyNodeExpansion } from './node_expansion';
import { BareLeftTreePartHandler } from './left_side_node_expansion';

const { freeze, memoize } = Helpers;

export interface PartialTreeBuild {
  buildPart: () => NodeExpansion | undefined,
  ignoresNewLines: () => boolean,
  error: StandardErrorsFn,
  instanceId: () => symbol
}

export const PartialTreeBuild = (() => {
  const tokenTypes = Token.types;

  const lineContinuationScheme = freeze({
    inGroup: Symbol(),
    operatorContinued: Symbol(),
    normal: Symbol()
  });

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
      (start: number,
       closeBasedOn: string):
       NodeExpansion | undefined
    {
      const group = PartialTreeStartGroupBuild.
        make(mTokens, BareLeftTreePartHandler.make(), start, mEnd, closeBasedOn);
      const built = group.startGroupBuild();
      if (built) return built;
      mErrorFn = group.error;
      return;
    }

    function ignoresNewLines(): boolean { return mLineContScheme !== lineContinuationScheme.normal; }

    function buildPart(): NodeExpansion | undefined {
      if (mStart === mEnd) {
        return EmptyNodeExpansion.make();
      }

      const startPos = mTokens.skipNewLine(mStart);
      if (startPos === mEnd) {
        return EmptyNodeExpansion.make();
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
          return _fromGroupStart(startPos, start.content());
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
      instanceId: memoize(Symbol)
    });
  }

  return freeze({
    makeAssumeNotNewLine,
    make,
    lineContinuationScheme
  });
})();
