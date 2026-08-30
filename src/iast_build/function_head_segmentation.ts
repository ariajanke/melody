import { Helpers, StandardError } from '../helpers';
import { Token } from '../token';
import { ChildSegmentGatherer } from './child_segment_gatherer';
import { FunctionDefinitionSegmentation } from './function_definition_segmentation';
import { ParentheticalSegmentation } from './parenthetical_segmentation';
import { Segment, Segmentation } from './segment';

const { freeze, memoize } = Helpers;

const kSeparator = Token.types.grouping.separator;

function make
  (mTokens: Readonly<Token[]>, mStart: number, mEnd: number): Segmentation
{
  FunctionDefinitionSegmentation.assertIsOpening(mTokens[mStart]);
  const { error, setErrorMessage } = StandardError.make();

  const headStart = memoize((): number | undefined => {
    let separatorCount = 0;
    for (let idx = mStart; idx < mEnd; ++idx) {
      if (Segment.isClosing(mTokens[idx])) {
        return idx;
      }

      if (mTokens[idx].type() === kSeparator) {
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
      return freeze({
        type : () => 'expression',
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

export const FunctionHeadSegmentation = freeze({ make });
