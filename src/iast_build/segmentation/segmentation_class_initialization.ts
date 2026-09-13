import { TableSegmentation } from './table_segmentation';
import { FunctionDefinitionSegmentation } from './function_definition_segmentation';
import { ParentheticalSegmentation } from './parenthetical_segmentation';
import { Segment, Segmentation, SegmentationConstructor } from '../segmentation';
import { Token } from '../../token';
import { FunctionBodySegmentation } from './function_body_segmentation';

Segment.initializeThisClass({
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

const { isEndOfInput } = FunctionBodySegmentation;

Segmentation.initializeThisClass({
  makeInitialSegmentation(mTokens: Readonly<Token[]>): Segmentation {
    return FunctionBodySegmentation.
      make(mTokens, 0, mTokens.length, isEndOfInput);
  },
});
