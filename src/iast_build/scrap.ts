import { GroupingNamingSchema } from '../grouping_naming_schema';
import { Helpers, raise, StandardError, StandardErrorMessage } from '../helpers';
import { IastNode } from '../iast_node';
import { Token } from '../token';

const { freeze, memoize } = Helpers;

// generally, segments are things that get turned into nodes
interface Segment {
  start   (): number;
  end     (): number;
  children(): Readonly<Segment[]>;
};

interface Segmentation {
  segment(): Segment | undefined;
  error(): StandardErrorMessage;
}

interface ChildSegmentGatherer {
  children(): Readonly<Segment[]>;
  pushChild(seg: Segment): ChildSegmentGatherer;
  ensureMutable(): ChildSegmentGatherer;
};

type SegmentationConstructor =
  (mTokens: Readonly<Token[]>, mStart: number, mEnd: number) => Segmentation;

const Segment = freeze({
  isClosing(tok: Token | undefined) {
    return tok === undefined || tok.type() === Token.types.closing;
  },
  groupingConstructorFor(token: Token): SegmentationConstructor | undefined {
    if (ParentheticalSegmentation.isOpening(token))
      { return ParentheticalSegmentation.make; }

    if (FunctionDefinitionSegmentation.isOpening(token))
      { return FunctionDefinitionSegmentation.make; }

    if (TableSegmentation.isOpening(token))
      { return TableSegmentation.make; }

    return undefined;
  }
});

const ChildSegmentGatherer = freeze({
  defaultEmpty: memoize((): ChildSegmentGatherer => freeze({
    children: memoize((): Readonly<Segment[]> => []),
    pushChild(_0: Segment) { raise('must ensure mutable'); },
    ensureMutable(): ChildSegmentGatherer {
      const mChildren: Segment[] = [];
      const inst: ChildSegmentGatherer = freeze({
        children: () => mChildren,
        pushChild(seg: Segment): ChildSegmentGatherer {
          mChildren.push(seg);
          return inst;
        },
        ensureMutable: () => inst
      });
      return inst;
    }
  }))
});

type ClosingPair = Readonly<{
  index: number;
  children(): Readonly<Segment[]>;
}>;

const TableSegmentation = freeze({
  isOpening(tok: Token): boolean {
    return tok.type() === Token.types.opening &&
           tok.content() === GroupingNamingSchema.kTableDefinition;
  },
  make(_0: Readonly<Token[]>, _1: number, _2: number): Segmentation {
    return freeze({
      segment: (): Segment | undefined => undefined,
      error  : memoize((): StandardErrorMessage =>
        freeze({ message: 'tables are not supported' }))
    })
  }
});

interface ExpressionScanningStrategy {
  groupingConstructorFor(token: Token): SegmentationConstructor | undefined;
  assertIsOpening(token: Token | undefined): void;
  isAbruptClosing(token: Token | undefined): boolean;
  isProperClosing(token: Token | undefined): boolean;
  continuesFor(token: Token): boolean;
};

const ParentheticalSegmentation = freeze({
  isOpening(token: Token): boolean {
    return token.content() === GroupingNamingSchema.kParentheticalOpen &&
           token.type() === 'opening';
  },
  assertIsOpening(token: Token | undefined): void {
    if (token && ParentheticalSegmentation.isOpening(token))
      { return; }
    raise(`"${token?.content() ?? '<EMPTY>'}" is not a parenthetical opening`);
  },
  strategy: memoize((): ExpressionScanningStrategy => freeze({
    assertIsOpening(token: Token | undefined) {
      ParentheticalSegmentation.assertIsOpening(token);
    },
    isAbruptClosing: Segment.isClosing,
    isProperClosing(token: Token | undefined): boolean {
      return token?.type() === Token.types.closing &&
             token?.content() === GroupingNamingSchema.kParentheticalClose;
    },
    continuesFor(token: Token): boolean {
      const { type } = token;
      return type() === Token.types.separator ||
             LineSegmentation.strategy().continuesFor(token);
    },
    groupingConstructorFor: Segment.groupingConstructorFor
  })),
  make(mTokens: Readonly<Token[]>, mStart: number, mEnd: number): Segmentation {
    return ExpressionSegmentation.
      make(mTokens, mStart, mEnd, ParentheticalSegmentation.strategy());
  }
});

// I'm a bit of an outsider. For me coding can be like an art.
// One particular challenge that I'm faced with is breaking up an array of
// things into a nested collections. Right away I'm sure you realize that a
// solution would have to be recursive in nature. Since it's recursive, the
// design and look of what you're trying to build is unclear. I'm framing my approach like trying to answer a question. By question here, I mean something 

const FunctionDefinitionSegmentation = freeze({
  isOpening(token: Token): boolean {
    return token.content() === GroupingNamingSchema.kFunctionDefinition &&
           token.type() === 'opening';
  },
  assertIsOpening(token: Token) {
    if (FunctionDefinitionSegmentation.isOpening(token))
      { return; }
    raise(`"${token.content()}" is not a function opening.`);
  },
  make(mTokens: Readonly<Token[]>, mStart: number, mEnd: number): Segmentation {
    FunctionDefinitionSegmentation.assertIsOpening(mTokens[mStart]);
    const { error, setErrorFn } = StandardError.make();
    const heading = memoize((): Segmentation =>
      FunctionHeadSegmentation.make(mTokens, mStart, mEnd));
    const body = memoize(() => {
      const { segment } = heading();
      if (!segment())
        { return setErrorFn(heading().error); }

      const m = FunctionBodySegmentation.
        make(mTokens, segment()!.start(), mEnd);
      return m.segment() ?? setErrorFn(m.error);
    });

    // NOTE ignore head for now
    const segment = body;

    return freeze({ segment, error });
  }
});

const FunctionHeadSegmentation = freeze({
  make(mTokens: Readonly<Token[]>, mStart: number, mEnd: number): Segmentation {
    FunctionDefinitionSegmentation.assertIsOpening(mTokens[mStart]);
    const { error, setErrorMessage } = StandardError.make();

    const headStart = memoize((): number | undefined => {
      let separatorCount = 0;
      for (let idx = mStart; idx < mEnd; ++idx) {
        if (Segment.isClosing(mTokens[idx])) {
          return idx;
        }

        if (mTokens[idx].type() === Token.types.separator) {
          // at most one separator until the head!
          ++separatorCount;
          if (separatorCount > 1) {
            return setErrorMessage('Too many new lines with no head/body found');
          }
          continue;
        }

        return idx;
      }
      return mEnd;
    });

    const segment = memoize((): Segment | undefined => {
      if (headStart() === undefined)
        { return undefined; }

      const start = mTokens[headStart()!];
      if (!ParentheticalSegmentation.isOpening(start)) {
        // no head! not an error!
        return freeze({
          start: headStart as () => number,
          end  : headStart as () => number,
          children: ChildSegmentGatherer.defaultEmpty().children
        });
      }
      
      const parenthetical = ParentheticalSegmentation.
        make(mTokens, headStart()!, mEnd);
      return parenthetical.segment();
    });

    return freeze({ segment, error });
  }
});

const FunctionBodySegmentation = freeze({
  assertIsClosing(token: Token | undefined) {
    if (token === undefined || token.type() === Token.types.closing)
      { return; }
    raise('body must end on a closing');
  },
  strategy: memoize((): ExpressionScanningStrategy => freeze({
    assertIsOpening(token: Token | undefined) {
      ParentheticalSegmentation.assertIsOpening(token);
    },
    isAbruptClosing(token: Token | undefined): boolean {
      return Segment.isClosing(token);
    },
    isProperClosing(token: Token | undefined): boolean {
      return token?.type() === Token.types.closing &&
             token?.content() === GroupingNamingSchema.kParentheticalClose;
    },
    continuesFor(token: Token): boolean {
      const { type } = token;
      return type() === Token.types.separator ||
             type() === Token.types.identifier ||
             type() === Token.types.literal ||
             type() === Token.types.operator;
    },
    groupingConstructorFor: Segment.groupingConstructorFor
  })),
  make(mTokens: Readonly<Token[]>, mStart: number, mEnd: number): Segmentation {
    FunctionBodySegmentation.assertIsClosing(mTokens[mEnd]);
    const { error, setErrorMessage, setErrorFn } = StandardError.make();

    const children = memoize(() => {
      let childGatherer = ChildSegmentGatherer.defaultEmpty();
      for (let idx = mStart; idx < mEnd; ) {
        const { segment, error } = LineSegmentation.make(mTokens, idx, mEnd);
        if (!segment()) {
          return setErrorFn(error);
        }
        childGatherer = childGatherer.ensureMutable().pushChild(segment()!);
        idx = segment()!.end();
      }
      return childGatherer.children();
    });
    

  }
});

const LineSegmentation = freeze({
  strategy: memoize((): ExpressionScanningStrategy => freeze({
    assertIsOpening(token: Token | undefined) {
      return token !== undefined;
    },
    isAbruptClosing(token: Token | undefined): boolean {
      return Segment.isClosing(token);
    },
    isProperClosing(token: Token | undefined): boolean {
      return token?.type() === Token.types.separator;
    },
    continuesFor(token: Token): boolean {
      const { type } = token;
      return type() === Token.types.identifier ||
             type() === Token.types.literal ||
             type() === Token.types.operator;
    },
    groupingConstructorFor: Segment.groupingConstructorFor
  })),
    make(mTokens: Readonly<Token[]>,
         mStart: number,
         mEnd: number
    ): Segmentation
    {
      return ExpressionSegmentation.
        make(mTokens, mStart, mEnd, LineSegmentation.strategy());
    }
});

const ExpressionSegmentation = freeze({
  make(mTokens: Readonly<Token[]>,
       mStart: number,
       mEnd: number,
       mScanStrat: ExpressionScanningStrategy): Segmentation
  {
    mScanStrat.assertIsOpening(mTokens[mStart]);
    const { error, setErrorMessage, setErrorFn } = StandardError.make();
    
    const closingPair = memoize((): ClosingPair | undefined => {
      let childGatherer = ChildSegmentGatherer.defaultEmpty();
      for (let idx = mStart; idx < mEnd; ) {
        const token: Token | undefined = mTokens[idx];
        if (mScanStrat.isAbruptClosing(mTokens[idx]))
          { return setErrorMessage(`unexpected close found at ${idx}`); }

        if (mScanStrat.isProperClosing(mTokens[idx]))
          { return freeze({ index: idx, children: childGatherer.children }); }

        const ctor = mScanStrat.groupingConstructorFor(token);
        if (ctor) {
          const { segment, error } = ctor(mTokens, idx, mEnd);
          if (!segment()) {
            return setErrorFn(error);
          }
          idx = segment()!.end();
          childGatherer = childGatherer.ensureMutable().pushChild(segment()!);
          continue;
        }

        if (mScanStrat.continuesFor(token)) {
          ++idx;
          continue;
        }

        raise(`Unhandled token type "${token.type()}", content "${token.content()}"`);
      }
      return setErrorMessage(`unexpectedly closed`);
    });

    const segment = memoize((): Segment | undefined => {
      if (!closingPair())
        { return undefined; }

      const { index, children } = closingPair()!;
      return freeze({
        start: () => mStart,
        end  : () => index,
        children
      });
    });

    return freeze({ segment, error });
  }
})

// start at root fn body ->
// - close body rule
// - seperators for sub-groupings
// 

// segments -> IAST nodes
// including operative statements into call trees

function intoCallTree(segment: Segment) {
  // each operator into a node "factory"
  // each literal and identifier into a node directly
  IastNode;
}