import { Helpers, raise, StandardError } from '../helpers';
import { Token } from '../token';
import { ChildSegmentGatherer } from './child_segment_gatherer';
import { FunctionDefinitionSegmentation } from './function_definition_segmentation';
import { ParentheticalSegmentation } from './parenthetical_segmentation';
import { Segment, Segmentation } from './segment';

const { freeze, memoize } = Helpers;

const kSeparator = Token.types.grouping.separator;

const kEmptyHead = freeze({
  type : () => 'expression',
  start: (): number => raise('must define start'),
  end  : (): number => raise('must define end'),
  children: ChildSegmentGatherer.defaultEmpty().children
});

const emptySegmentAt = (posFn: () => number): Segment =>
  freeze({ ...kEmptyHead, start: posFn, end: posFn });

function make
  (mTokens: Readonly<Token[]>, mStart: number, mEnd: number): Segmentation
{
  FunctionDefinitionSegmentation.assertIsOpening(mTokens[mStart]);
  const { error, setErrorMessage, setErrorFn } = StandardError.make();
  const isParentheticalOpening = ParentheticalSegmentation.isOpening;

  const headStart = memoize((): number | undefined => {
    let separatorCount = 0;
    for (let idx = mStart + 1; idx < mEnd; ++idx) {
      const token = mTokens[idx];

      if (isParentheticalOpening(token) || Segment.isClosing(token))
        { return idx; }

      if (token.type() === kSeparator) {
        // at most one separator until the head!
        ++separatorCount;
        if (separatorCount > 1) {
          return setErrorMessage('Too many new lines with no head/body found');
        }
        continue;
      }

      return idx - separatorCount;
    }
    return mEnd;
  });

  const segment = memoize((): Segment | undefined => {
    if (headStart() === undefined)
      { return undefined; }

    const start = mTokens[headStart()!];
    if (!isParentheticalOpening(start))
      { return emptySegmentAt(headStart as () => number); }
    
    const parenthetical = ParentheticalSegmentation.
      make(mTokens, headStart()!, mEnd);
    return parenthetical.segment() ?? setErrorFn(parenthetical.error);
  });

  return freeze({ segment, error });
}

export const FunctionHeadSegmentation = freeze({ make });
