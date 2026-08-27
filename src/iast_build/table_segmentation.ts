import { GroupingNamingSchema } from '../grouping_naming_schema';
import { Helpers, StandardErrorMessage } from '../helpers';
import { Token } from '../token';
import { Segment, Segmentation } from './segment';

const { freeze, memoize } = Helpers;

export const TableSegmentation = freeze({
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
