import { TestHelpers } from '../test_helpers';
import { TokenRange } from '../../src/token_range';
import { Token } from '../../src/token';
import {
  FnClosePositionRetrieval
} from '../../src/ast_build/fn_close_position_retrieval';

const { describeNamed } = TestHelpers;

describeNamed({ FnClosePositionRetrieval }, () => {
  const make = (...tokenStrings: string[]) => {
    const { makeFromStringOnly } = Token.forTesting;
    const range = TokenRange.makeStartingRange(tokenStrings.map(makeFromStringOnly))
    const open = range.startToken();
    return FnClosePositionRetrieval.make(range.step(), open);
  };
  describe('"fn" in isolation', () => {
    const { closePosition } = make('fn');

    it('is the correct position', () =>
      expect(closePosition()).toEqual(1));
  });
  describe('fn x\ny', () => {
    const { closePosition } = make('fn', 'x', '\n', 'y');

    it('is the correct position', () =>
      expect(closePosition()).toEqual(2));
  });
  describe('fn fn x\ny', () => {
    const { closePosition } = make('fn', 'fn', 'x', '\n', 'y');

    it('is the correct position', () =>
      expect(closePosition()).toEqual(3));
  });
  describe('fn\n  x\n  y', () => {
    const { closePosition } = make('fn', '\n', 'x', '\n', 'y');

    it('is the correct position', () =>
      expect(closePosition()).toEqual(5));
  });
  describe('fn\n  x\n~\ny', () => {
    const { closePosition } = make('fn', '\n', 'x', '\n', '~', '\n', 'y');

    it('is the correct position', () =>
      expect(closePosition()).toEqual(4));
  });
});
