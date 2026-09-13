import { GroupingNamingSchema } from '../../grouping_naming_schema';
import { Helpers, raise, StandardError } from '../../helpers';
import { Token } from '../../token';
import { ChildSegmentGatherer } from './child_segment_gatherer';
import { ClosingPair } from './expression_segmentation';
import { LineSegmentation } from './line_segmentation';
import { Segment, Segmentation } from '../segmentation';

const { freeze, memoize } = Helpers;

const kClosing = Token.types.grouping.closing;

function isBodyClosing(token: Token | undefined): boolean {
  return token?.type() === kClosing &&
         token?.content() === GroupingNamingSchema.kBodyClose;
}

function isEndOfInput(token: Token | undefined): boolean
  { return token === undefined; }

const isSeparator = LineSegmentation.isProperClose;

function assertIsClosing(token: Token | undefined): void {
  if (token === undefined || token.type() === kClosing)
    { return; }
  raise('body must end on a closing');
}

function make
  (mTokens: Readonly<Token[]>,
   mStart: number,
   mEnd: number,
   mIsClose: (token: Token | undefined) => boolean): Segmentation
{
  assertIsClosing(mTokens[mEnd]);
  const { error, setErrorFn } = StandardError.make();

  const closingPair = memoize((): ClosingPair | undefined => {
    let childGatherer = ChildSegmentGatherer.defaultEmpty();
    let idx = mStart;
    while (idx < mEnd) {
      const token = mTokens[idx];
      if (mIsClose(token))
        { break; }

      if (isSeparator(token)) {
        ++idx;
        continue;
      }

      const { segment, error } = LineSegmentation.make(mTokens, idx, mEnd);
      if (!segment())
        { return setErrorFn(error); }

      childGatherer = childGatherer.ensureMutable().pushChild(segment()!);
      idx = segment()!.end();
    }

    return freeze({
      index: idx,
      children: childGatherer.children,
    });
  });

  const segment = memoize((): Segment | undefined => {
    if (!closingPair())
      { return undefined; }

    const { children, index } = closingPair()!;
    return freeze({
      type    : () => 'functionDefinitionBody',
      start   : () => mStart,
      end     : () => index,
      children
    });
  });
  
  return freeze({ segment, error });
}

export const FunctionBodySegmentation = freeze({
  isEndOfInput,
  isBodyClosing,
  assertIsClosing,
  make
});
