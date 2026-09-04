import { GroupingNamingSchema } from '../grouping_naming_schema';
import { Helpers, raise, StandardError } from '../helpers';
import { Token } from '../token';
import { FunctionBodySegmentation } from './function_body_segmentation';
import { FunctionHeadSegmentation } from './function_head_segmentation';
import { Segment, Segmentation } from './segment';

const { freeze, memoize } = Helpers;

export const FunctionDefinitionSegmentation = freeze({
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
    const { isBodyClosing } = FunctionBodySegmentation;
    const { error, setErrorFn } = StandardError.make();
    const heading = memoize((): Segmentation =>
      FunctionHeadSegmentation.make(mTokens, mStart, mEnd));
    const body_ = memoize(() => {
      const { segment } = heading();
      if (!segment())
        { return setErrorFn(heading().error); }

      const m = FunctionBodySegmentation.
        make(mTokens, segment()!.start(), mEnd);
      return m.segment() ?? setErrorFn(m.error);
    });

    const definitionEnd = memoize((): number | undefined => {
      if (!body_())
        { return undefined; }

      const idx = body_()!.end();
      if (isBodyClosing(mTokens[idx]))
        { return idx + 1; }

      if (idx === mEnd)
        { return idx; }

      raise('Body segmentation must place index at body close or end position');
    });

    const segment = memoize((): Segment | undefined => {
      if (!body_() || !definitionEnd())
        { return undefined; }

      return freeze({
        children: body_()!.children,
        type: body_()!.type,
        start: () => mStart,
        end: definitionEnd as () => number
      });
    });

    return freeze({ segment, error });
  }
});
