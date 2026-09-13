import { TestHelpers } from '../test_helpers';
import { Token } from '../../src/token';
import { Helpers } from '../../src/helpers';
import { TokenFactories } from '../token_factories';
import { FunctionDefinitionSegmentation } from '../../src/iast_build/segmentation/function_definition_segmentation';

const { describeNamed } = TestHelpers;
const { memoize } = Helpers;

describeNamed({ FunctionDefinitionSegmentation }, () => {
  const { stringsIntoTokens } = TokenFactories;
  const makeInstFromTokens = (toks: Readonly<Token[]>) =>
      memoize(() => FunctionDefinitionSegmentation.make(toks, 0, toks.length));
  const makeInst = (strings: Readonly<string[]>) =>
    makeInstFromTokens(stringsIntoTokens(strings));
  type InstFn = ReturnType<typeof makeInst>;

  function isSegmentEnclosed(inst: InstFn, exStart: number, exEnd: number) {
    it(`is valid segment within [${exStart} ${exEnd})`, () => {
      expect(inst().segment()).toBeDefined();
      expect(inst().segment()?.start()).toEqual(exStart);
      expect(inst().segment()?.end()).toEqual(exEnd);
    });
  }

  function hasUniqueChildSegment(inst: InstFn, exStart: number, exEnd: number) {
    hasNChildren(inst, 1);
    forNthChild(inst, 0, exStart, exEnd);
  }

  function hasNChildren(inst: InstFn, count: number) {
    const children = memoize(() => inst().segment()?.children());

    it(`has exactly ${count} child segment(s)`, () =>
      expect(children()?.length).toEqual(count));
  }

  function forNthChild(inst: InstFn, nthChild: number, exStart: number, exEnd: number) {
    const children = memoize(() => inst().segment()?.children());
    const child = memoize(() => {
      if (!children()) { return undefined; }

      return children()![nthChild];
    });
    it(`child (${nthChild}) segment that is typed as 'expression'`, () =>
      expect(child()?.type()).toEqual('expression'));
    it(`child (${nthChild}) segment within [${exStart} ${exEnd})`, () => {
      expect(child()?.start()).toEqual(exStart);
      expect(child()?.end()).toEqual(exEnd);
    });
  }

  describe('fn ~', () => {
    const inst = makeInst(['fn', '~']);
    isSegmentEnclosed(inst, 0, 2);
  });

  const kHeadlessAddition = ['fn', '2', '+', '1'];
  const kHeadedAddition = ['fn', '(', ')', '2', '+', '1'];
  const kHeadedEmptyTuple = ['fn', '(', ')', '(', ')'];
  const kMiscLine = ['let', 'b', '=', '5'];
  describe('fn 2 + 1 ~', () => {
    const inst = makeInst([...kHeadlessAddition, '~']);
    isSegmentEnclosed(inst, 0, 5);
    hasUniqueChildSegment(inst, 1, 4);
  });

  describe('fn () 2 + 1 ~', () => {
    const inst = makeInst([...kHeadedAddition, '~']);
    isSegmentEnclosed(inst, 0, 7);
    hasUniqueChildSegment(inst, 3, 6);
  });

  describe('fn () () ~', () => {
    const inst = makeInst([...kHeadedEmptyTuple, '~']);
    isSegmentEnclosed(inst, 0, 6);
    hasUniqueChildSegment(inst, 3, 5);
  });

  describe('fn 2 + 1 \\n ...', () => {
    const inst = makeInst([
      ...kHeadlessAddition, '\n',
      ...kMiscLine
    ]);
    isSegmentEnclosed(inst, 0, 4);
    hasUniqueChildSegment(inst, 1, 4);
  });

  describe('fn () 2 + 1 \\n ...', () => {
    const inst = makeInst([
      ...kHeadedAddition, '\n',
      ...kMiscLine
    ]);
    isSegmentEnclosed(inst, 0, 6);
    hasUniqueChildSegment(inst, 3, 6);
  });

  describe('fn () () \\n ...', () => {
    const inst = makeInst([
      ...kHeadedEmptyTuple, '\n',
      ...kMiscLine
    ]);
    isSegmentEnclosed(inst, 0, 5);
    hasUniqueChildSegment(inst, 3, 5);
  });
  
  describe('multiline headless', () => {
    const inst = makeInst([
      'fn', '\n  ',
      'stuff', '\n',
      '~',
      ...kMiscLine
    ]);
    isSegmentEnclosed(inst, 0, 5);
    hasUniqueChildSegment(inst, 2, 3);
  });
  
  describe('multiline same line head', () => {
    const inst = makeInst([
      'fn', '(', ')', '\n  ',
      'stuff', '\n',
      '~',
      ...kMiscLine
    ]);

    isSegmentEnclosed(inst, 0, 7);
    hasUniqueChildSegment(inst, 4, 5);
  });
  
  describe('multiline separate line head', () => {
    const inst = makeInst([
      'fn', '\n  ',
      '(', ')', '\n  ',
      'stuff', '\n',
      '~'
    ]);

    isSegmentEnclosed(inst, 0, 8);
    hasUniqueChildSegment(inst, 5, 6);
  });

  const kSimpleFnDef = ['let', 'f', '=', 'fn', '~'];
  describe('multiline nested within headless', () => {
    const inst = makeInst([
      'fn', '\n  ',
      ...kSimpleFnDef, '\n',
      '~',
      ...kMiscLine
    ]);

    isSegmentEnclosed(inst, 0, 9);
    hasUniqueChildSegment(inst, 2, 7);
  });
  
  describe('multiline multiple nested', () => {
    const inst = makeInst([
      'fn', '\n  ', // 2
      '(', ')', '\n  ', // 5
      ...kSimpleFnDef, '\n  ', // 11
      'let', 'g', '=', 'fn', '(', ')', '\n    ', // 18
      'stuff', '\n  ', // 20
      '~', '\n', // 22
      'hello', '\n', // 24
      '~', // 25
      ...kMiscLine
    ]);
    
    isSegmentEnclosed(inst, 0, 25);

    hasNChildren(inst, 3);

    forNthChild(inst, 0, 5, 10);
    forNthChild(inst, 1, 11, 21);
    forNthChild(inst, 2, 22, 23);
  });
});
