import { Helpers, raise, StandardErrorMessage } from '../helpers';
import { Token } from '../token';

const { freeze } = Helpers;

export type SegmentType = 'functionDefinitionBody' | 'expression';

export interface Segmentation {
  segment(): Segment | undefined;
  error(): StandardErrorMessage;
};

export type SegmentationConstructor =
  (mTokens: Readonly<Token[]>, mStart: number, mEnd: number) => Segmentation;

export interface Segment {
  type    (): SegmentType;
  start   (): number;
  end     (): number;
  children(): Readonly<Segment[]>;
};

export interface SegmentClassInitialization {
  groupingConstructorFor(token: Token): SegmentationConstructor | undefined;
};

let sInitializable: SegmentClassInitialization | undefined = undefined;

interface SegmentReductionVisitor<ResultType = void> {
  visitChild<ResultType>(child: Segment, parent: Segment): ResultType;
  visitIndex<ResultType>(idx: number): ResultType;
};

function segmentReduction<ResultType = void>
  (segment: Segment,
   intf: SegmentReductionVisitor<ResultType>,
   initialValue: ResultType): ResultType
{
  let cidx = 0;
  for (let idx = segment.start(); idx < segment.end(); ) {
    const child = segment.children()[cidx];
    if (idx === child?.start()) {
      initialValue = intf.visitChild(child, segment);
      
      idx = child.end();
      ++cidx;
    } else {
      initialValue = intf.visitIndex(idx);
      ++idx;
    }
    if (initialValue === false)
      { return initialValue; }
  }

  return initialValue;
}

const kValidIndicesReduction = freeze({
  visitChild(child: Segment, parent: Segment): boolean {
    if (!Segment.hasValidIndices(child))
      { return false; }

    return child.end() <= parent.end();
  },
  visitIndex(_0: number): boolean
    { return true; }
});

export const Segment = freeze({
  hasValidIndices(segment: Segment): boolean {
    let cidx = 0;
    for (let idx = segment.start(); idx < segment.end(); ) {
      const child = segment.children()[cidx];
      if (idx === child?.start()) {
        if (!Segment.hasValidIndices(child) ||
            child.end() > segment.end())
          { return false; }

        idx = child.end();
        ++cidx;
      } else {
        ++idx;
      }
    }

    return cidx === segment.children().length;
  },
  initializeThisClass(i: SegmentClassInitialization): void {
    if (sInitializable)
      { raise('Segment already initialized'); }

    sInitializable = i;
  },
  isFringe(tok: Token | undefined): boolean {
    return tok === undefined ||
           tok.type() === Token.types.identifier ||
           Token.isLiteral(tok);
  },
  isClosing(tok: Token | undefined) {
    return tok === undefined || tok.type() === Token.types.grouping.closing;
  },
  groupingConstructorFor(token: Token): SegmentationConstructor | undefined {
    return sInitializable!.groupingConstructorFor(token);
  }
});
