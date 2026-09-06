import { TestHelpers } from '../test_helpers';
import { Token, TokenType } from '../../src/token';
import { Helpers } from '../../src/helpers';
import { ParentheticalSegmentation } from '../../src/iast_build/parenthetical_segmentation';
import { Segment } from '../../src/iast_build/segment';

const { describeNamed } = TestHelpers;
const { freeze, memoize } = Helpers;

describeNamed({ ParentheticalSegmentation }, () => {
  // TODO ParentheticalSegmentation must not include its delimiters
  const makeToken = (content: string, type: TokenType): Token => {
    return freeze({
      start: pos,
      end: pos,
      content: () => content,
      type: () => type
    });
  };
  const pos = () => 0;
  const opT: Token = makeToken('op', Token.types.operator);
  const idT: Token = makeToken('id', Token.types.identifier);
  const openT: Token = makeToken('(', Token.types.grouping.opening);
  const closeT: Token = makeToken(')', Token.types.grouping.closing);
  const makeInst = (toks: Readonly<Token[]>) =>
    memoize(() => ParentheticalSegmentation.make(toks, 0, toks.length));
  type InstFn = ReturnType<typeof makeInst>;

  function isSegmentEnclosed(inst: InstFn, exStart: number, exEnd: number) {
    it('is segment enclosed by parens', () => {
      expect(inst().segment()).toBeDefined();
      expect(inst().segment()?.start()).toEqual(exStart);
      expect(inst().segment()?.end()).toEqual(exEnd);
    });

    it('has valid indices', () => {
      const seg = inst().segment();
      if (!seg)
        { return fail(); }

      expect(Segment.hasValidIndices(seg)).toBeTruthy();
    });
  }

  describe('base case', () => {
    const inst = makeInst([openT, idT, closeT, opT]);

    isSegmentEnclosed(inst, 0, 3);
  });
  describe('shallow nested case', () => {
    const inst = makeInst([
      openT, idT, opT, openT, idT, opT, idT, closeT, idT, closeT, opT
    ]);

    isSegmentEnclosed(inst, 0, 10);

    it('has a single child segment', () => {      
      if (!inst().segment())
        { return fail(); }
      
      expect(inst().segment()!.children().length).toEqual(1);
      expect(inst().segment()!.children()[0]?.start()).toEqual(3);
      expect(inst().segment()!.children()[0]?.end()).toEqual(8);
    });
  });

  describe('series of shallow nested case', () => {
    const inner = [openT, closeT];
    const inst = makeInst([openT, ...inner, idT, ...inner, closeT, idT]);

    const childCount = () => inst().segment()?.children().length;
    const children = () => inst().segment()!.children();

    isSegmentEnclosed(inst, 0, 7);

    it('has two children', () => {
      expect(childCount()).toEqual(2);
    });

    it('has first child of correct start and end', () => {
      if (childCount() !== 2)
        { return fail(); }
      
      expect(children()[0]?.start()).toEqual(1);
      expect(children()[0]?.end()).toEqual(3);
    });

    it('has second child of correct start and end', () => {
      if (childCount() !== 2)
        { return fail(); }

      expect(children()[1]?.start()).toEqual(4);
      expect(children()[1]?.end()).toEqual(6);
    });
  });

  describe('deep nested case', () => {
    const inst = makeInst([openT, openT, openT, closeT, closeT, closeT, idT]);

    const childCount = () => inst().segment()?.children().length;
    const children = () => inst().segment()!.children();
    const grandChildren = () => children()[0].children();
    const grandChild = () => grandChildren()[0];
    const grandChildrenCount = () => grandChildren().length;
    
    isSegmentEnclosed(inst, 0, 6);

    it('has one child', () => expect(childCount()).toEqual(1));

    it('is child has exactly one child itself', () => {
      if (childCount() !== 1)
        { return fail(); }

      expect(grandChildrenCount()).toEqual(1);
    });

    it('is child has correct range', () => {
      if (childCount() !== 1)
        { return fail(); }

      expect(children()[0].start()).toEqual(1);
      expect(children()[0].end()).toEqual(5);
    });

    it('is grandchild has correct range', () => {
      if (childCount() !== 1 || grandChildrenCount() !== 1)
        { return fail(); }

      expect(grandChild().start()).toEqual(2);
      expect(grandChild().end()).toEqual(4);
    });
  });
});
