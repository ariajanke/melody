import { GroupingNamingSchema } from '../../grouping_naming_schema';
import { Helpers, raise, StandardError } from '../../helpers';
import { Token } from '../../token';
import { FunctionBodySegmentation } from './function_body_segmentation';
import { FunctionHeadSegmentation } from './function_head_segmentation';
import { LineSegmentation } from './line_segmentation';
import { Segment, Segmentation } from '../segmentation';

type BodyClosingFunc = (token: Token | undefined) => boolean;

const { freeze, memoize } = Helpers;

const { isBodyClosing } = FunctionBodySegmentation;

const isSeparator = LineSegmentation.isProperClose;

function isSeparatorOrBodyClose(token: Token | undefined): boolean
  { return isSeparator(token) || isBodyClosing(token); }

function isMultiLine(mTokens: Readonly<Token[]>, headSegment: Segment): boolean {
  // NOTE is multiline if head contains or is immediately followed by a
  //      seperator
  const { start, end } = headSegment;
  for (let idx = start(); idx < end(); ++idx) {
    if (isSeparator(mTokens[idx]))
      { return true; }
  }

  return isSeparator(mTokens[end()]);
}

function make
  (mTokens: Readonly<Token[]>, mStart: number, mEnd: number): Segmentation
{
  FunctionDefinitionSegmentation.assertIsOpening(mTokens[mStart]); 

  const { error, setErrorFn } = StandardError.make();

  const heading = memoize((): Segmentation =>
    FunctionHeadSegmentation.make(mTokens, mStart, mEnd));
  
  const isBodyClosingFunc = memoize((): BodyClosingFunc | undefined => {
    const { segment } = heading();
    if (!segment())
      { return setErrorFn(heading().error); }

    return isMultiLine(mTokens, segment()!) ?
      isBodyClosing : isSeparatorOrBodyClose;
  });

  const body_ = memoize((): Segment | undefined => {
    if (!isBodyClosingFunc())
      { return undefined; }

    const { segment, error } = FunctionBodySegmentation.
      make(mTokens, heading().segment()!.end(), mEnd, isBodyClosingFunc()!);
    return segment() ?? setErrorFn(error);
  });

  const definitionEnd = memoize((): number | undefined => {
    if (!body_())
      { return undefined; }

    const idx = body_()!.end();
    const token = mTokens[idx];
    if (isBodyClosing(token))
      { return idx + 1; }

    if (idx === mEnd || isSeparator(token))
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
  make  
});
