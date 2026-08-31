import { TestHelpers } from '../test_helpers';
import { Token, TokenType } from '../../src/token';
import { Helpers } from '../../src/helpers';
import { FunctionDefinitionSegmentation } from '../../src/iast_build/function_definition_segmentation';
import { TokenFactories } from '../token_factories';

const { describeNamed } = TestHelpers;
const { freeze, memoize } = Helpers;

describeNamed({ FunctionDefinitionSegmentation }, () => {
  // single line, explicit
  const { stringsIntoTokens } = TokenFactories;
  const makeInstFromTokens = (toks: Readonly<Token[]>) =>
      memoize(() => FunctionDefinitionSegmentation.make(toks, 0, toks.length));
  const makeInst = (strings: Readonly<string[]>) =>
    makeInstFromTokens(stringsIntoTokens(strings));
  // TODO DRY me
  type InstFn = ReturnType<typeof makeInst>;

  function isSegmentEnclosed(inst: InstFn, exStart: number, exEnd: number) {
    it(`is valid segment within [${exStart} ${exEnd})`, () => {
      expect(inst().segment()).toBeDefined();
      expect(inst().segment()?.start()).toEqual(exStart);
      expect(inst().segment()?.end()).toEqual(exEnd);
    });
  }

  function hasLineSegment(inst: InstFn, exStart: number, exEnd: number) {
    const children = memoize(() => inst().segment()?.children());
    const child = memoize(() => {
      if (!children()) { return undefined; }

      return children()![0];
    });

    it('has a single child segment', () =>
      expect(children()?.length).toEqual(1));
    it(`has child segment that is typed as 'expression'`, () =>
      expect(child()?.type()).toEqual('expression'));
    it(`has child segment within [${exStart} ${exEnd})`, () => {
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
    hasLineSegment(inst, 1, 4);
  });

  describe('fn () 2 + 1 ~', () => {
    const inst = makeInst([...kHeadedAddition, '~']);
    isSegmentEnclosed(inst, 0, 7);
    hasLineSegment(inst, 3, 6);
  });

  describe('fn () () ~', () => {
    const inst = makeInst([...kHeadedEmptyTuple, '~']);
    isSegmentEnclosed(inst, 0, 6);
    hasLineSegment(inst, 3, 5);
  });

  describe('fn 2 + 1 \\n ...', () => {
    const inst = makeInst([
      ...kHeadlessAddition, '\n',
      ...kMiscLine
    ]);
    it('must be written', fail);
  });

  describe('fn () 2 + 1 \\n ...', () => {
    const inst = makeInst([
      ...kHeadedAddition, '\n',
      ...kMiscLine
    ]);
    it('must be written', fail);
  });

  describe('fn () () \\n ...', () => {
    const inst = makeInst([
      ...kHeadedEmptyTuple, '\n',
      ...kMiscLine
    ]);
    it('must be written', fail);
  });
  
  describe('multiline headless', () => {
    const inst = makeInst([
      'fn', '\n  ',
      'stuff', '\n',
      '~'
    ]);
    it('must be written', fail);
  });
  
  describe('multiline same line head', () => {
    const inst = makeInst([
      'fn', '(', ')', '\n  ',
      'stuff', '\n',
      '~'
    ]);
    it('must be written', fail);
  });
  
  describe('multiline separate line head', () => {
    const inst = makeInst([
      'fn', '\n  ',
      '(', ')', '\n  ',
      'stuff', '\n',
      '~'
    ]);
    it('must be written', fail);
  });

  const kSimpleFnDef = ['let', 'f', '=', 'fn', '~'];
  describe('multiline nested within headless', () => {
    const inst = makeInst([
      'fn', '\n  ',
      ...kSimpleFnDef, '\n',
      '~'
    ]);
    it('must be written', fail);
  });
  
  describe('multiline multiple nested', () => {
    const inst = makeInst([
      'fn', '\n  ',
      '(', ')', '\n  ',
      ...kSimpleFnDef, '\n  ',
      'let', 'g', '=', 'fn', '(', ')', '\n    ',
      'stuff', '\n  ',
      '~', '\n',
      '~'
    ]);
    it('must be written', fail);
  });
});
