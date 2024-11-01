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
    make('fn');
  });
  describe('fn x\ny', () => {
    make('fn', 'x', '\n', 'y');
  });
  describe('fn fn x\ny', () => {
    make('fn', 'fn', 'x', '\n', 'y');
  });
  describe('fn\n  x\n  y', () => {
    make('fn', '\n', 'x', '\n', 'y');
  });
  describe('fn\n  x\n~\ny', () => {
    make('fn', '\n', 'x', '\n', '~', '\n', 'y');
  });
});
