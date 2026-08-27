import { TableSegmentation } from './table_segmentation';
import { FunctionDefinitionSegmentation } from './function_definition_segmentation';
import { ParentheticalSegmentation } from './parenthetical_segmentation';
import { Segment, SegmentationConstructor } from './segment';
import { Token } from '../token';

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
