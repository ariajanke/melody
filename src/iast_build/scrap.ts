import { GroupingNamingSchema } from '../grouping_naming_schema';
import { Helpers, raise, StandardError, StandardErrorMessage } from '../helpers';
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

const ParentheticalSegmentation = freeze({
  isOpening(token: Token): boolean {
    return token.content() === GroupingNamingSchema.kParentheticalOpen &&
           token.type() === 'opening';
  },
  assertIsOpening(token: Token): void {
    if (ParentheticalSegmentation.isOpening(token))
      { return; }
    raise(`"${token.content()}" is not a parenthetical opening`);
  },
  make(mTokens: Readonly<Token[]>, mStart: number, mEnd: number): Segmentation {
    ParentheticalSegmentation.assertIsOpening(mTokens[mStart]);
    const { error, setErrorMessage, setErrorFn } = StandardError.make();
    
    const closingPair = memoize((): ClosingPair | undefined => {
      let childGatherer = ChildSegmentGatherer.defaultEmpty();
      for (let idx = mStart; idx < mEnd; ++idx) {
        if (Segment.isClosing(mTokens[idx])) {
          const tok: Token | undefined = mTokens[idx];
          if (tok?.content() === GroupingNamingSchema.kParentheticalClose) {
            return { index: idx, children: childGatherer.children };
          }
          return setErrorMessage(`unexpected close found at ${idx}`);
        }

        const token = mTokens[idx];
        const { type, content } = mTokens[idx];

        const ctor = Segment.groupingConstructorFor(token);
        if (ctor) {
          const { segment, error } = ctor(mTokens, idx, mEnd);
          if (!segment()) {
            return setErrorFn(error);
          }
          idx = segment()!.end() - 1;
          childGatherer = childGatherer.ensureMutable().pushChild(segment()!);
        }

        if (type() === Token.types.separator)
          { continue; }
        if (type() === Token.types.identifier ||
            type() === Token.types.literal ||
            type() === Token.types.operator)
        { continue; }
        raise(`Unhandled token type "${type()}", content "${content()}"`);
      }
    });

    const segment = memoize((): Segment | undefined => {
      if (!closingPair())
        { return undefined; }

      return freeze({
        start: () => mStart,
        end  : () => closingPair()!.index,
        children: closingPair()!.children
      });
    });

    return freeze({ segment, error });
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
    // find the def closing...
    // explicitly by "~"
    // implicitly by "e" followed by "\n"
    //   where "e" is a non parenthetical expression
    const heading = memoize((): Segmentation =>
      FunctionHeadSegmentation.make(mTokens, mStart, mEnd));
    const body = memoize(() => {
      if (!heading().segment()) {
        return 
      }

      const segment_ = heading().segment()!;
      // body start just beyond the head
      // how the body closes depends on what the head stepped over...

    });
  }
});

const FunctionHeadSegmentation = freeze({
  make(mTokens: Readonly<Token[]>, mStart: number, mEnd: number): Segmentation {
    FunctionDefinitionSegmentation.assertIsOpening(mTokens[mStart]);
    const { error, setErrorMessage, setErrorFn } = StandardError.make();

    // next parenthetical segment is considered to be the parameter list

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

    return freeze({ segment });
  }
}); // fn onward

const FunctionBodySegmentation = freeze({
  assertIsClosing(token: Token | undefined) {
    if (token === undefined || token.type() === Token.types.closing)
      { return; }
    raise('body must end on a closing');
  },
  make(mTokens: Readonly<Token[]>, mStart: number, mEnd: number) {
    FunctionBodySegmentation.assertIsClosing(mTokens[mEnd]);

    function nextLineFrom(idx: number): number {
      for (; idx < mEnd; ++idx) {
        const tok = mTokens[idx];
        if (tok.type() === Token.types.separator) {
          return idx;
        }
        // typical statement rules...
      }
      return idx;
    }

    const segments = memoize(() => {
      for (let idx = mStart; idx < mEnd; ) {
        idx = nextLineFrom(idx);
      }
    });
    

  }
});
const ExpressionSegmentation;

// start at root fn body ->
// - close body rule
// - seperators for sub-groupings
// 