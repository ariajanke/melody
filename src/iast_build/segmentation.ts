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

export interface SegmentationClass {
  makeInitialSegmentation(mTokens: Readonly<Token[]>): Segmentation;
};

let sInitializableTn: SegmentationClass | undefined = undefined;

export const Segmentation = freeze({
  initializeThisClass(i: SegmentationClass) {
    if (sInitializableTn) {
      raise('Segmentation already initialized');
    }

    sInitializableTn = i;
  },
  makeInitialSegmentation(mTokens: Readonly<Token[]>) {
    return (sInitializableTn ?? raise('uninitialized class')).
      makeInitialSegmentation(mTokens);
  }
});
