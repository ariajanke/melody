import { TestHelpers } from '../../test_helpers';
import { ClosePositionRetrieval } from '../../../src/vast_build/ast_build/close_position_retrieval';
import { TokenRange } from '../../../src/token_range';
import { Token } from '../../../src/token';

const { describeNamed } = TestHelpers;

describeNamed({ ClosePositionRetrieval }, () => {
  const { make } = ClosePositionRetrieval;
  const { makeStartingRange } = TokenRange;
  const makeToken = Token.forTesting.makeFromStringOnly;
  const asTokens = (...arr: string[]): Token[] =>
    arr.map((value: string) => makeToken(value));
  const asTokenRange = (...arr: string[]): TokenRange => {
    return makeStartingRange(asTokens(...arr));
  };
  const makeFromTokens = (...arr: string[]): ClosePositionRetrieval => {
    const range = asTokenRange(...arr);
    const head = range.tokenAt(0);
    return make(range.step(), head);
  };

  it('()', () => {
    const retr = makeFromTokens('(', ')');
    expect(retr.closePosition()).toEqual(1);
  });

  it('( <some other token> )', () => {
    const retr = makeFromTokens('(', 'a', ')');
    expect(retr.closePosition()).toEqual(2);
  });

  it('( <many tokens> )', () => {
    const retr = makeFromTokens('(', 'a', 'b', 'a', 'l', ')');
    expect(retr.closePosition()).toEqual(5);
  });

  it('"(" errors', () => {
    const retr = makeFromTokens('(');
    expect(retr.closePosition()).not.toBeDefined();
    expect(retr.error().message).toEqual('Cannot find close position for (');
  });

  it('(())', () => {
    const retr = makeFromTokens('(', '(', ')', ')');
    expect(retr.closePosition()).toEqual(3);
  });

  it('( <some token> ())', () => {
    const retr = makeFromTokens('(', 'a', '(', ')', ')');
    expect(retr.closePosition()).toEqual(4);
  });

  it('(()())', () => {
    const retr = makeFromTokens('(', '(', ')', '(', ')', ')');
    expect(retr.closePosition()).toEqual(5);

  });

  it('((())()))', () => {
    const retr =
      makeFromTokens('(',
                     '(','(',')',')',
                     '(',')',
                     ')',')');
    expect(retr.closePosition()).toEqual(7);
  });
});
