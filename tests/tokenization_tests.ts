import { TestHelpers } from './test_helpers';
import { Tokenization } from '../src/tokenization';
import { TokenRange } from '../src/token_range';

const { describeNamed } = TestHelpers;

describeNamed({ Tokenization }, () => {
  const getTokens = (inp: string): string[] => {
    const strings: string[] = [];
    const range = Tokenization.
      make().
      tokenize(inp);
    TokenRange.forEachIn(range, (str: string) => strings.push(str));
    return strings;
  };

  it('splits a hello world program', () => {
    expect(getTokens("puts('hello')")).toEqual(['puts', '(', "'hello'", ')']);
  });

  describe('operators', () => {
    ([
      [':=='   , [':=', '=']],
      ['==='   , ['=', '=', '=']],
      ['n := p', ['n', ':=', 'p']],
      ['n:=p'  , ['n', ':=', 'p']],
      ['n=p'   , ['n', '=', 'p']]
    ] as [string, string[]][]).
      forEach((pair: [string, string[]]) => {
        const [toSplit, expectedSplit] = pair;
        it(`splits "${toSplit}" correctly`, () => {
          expect(getTokens(toSplit)).toEqual(expectedSplit);
        });
      });
  });

  describe('whitespace', () => {
    ([
      ['new lines', 'a\nb\n\nc', ['a', '\n', 'b', '\n\n', 'c']],
      [
        'spaces',
        "puts ('hello',   'world')  ",
        ['puts', '(', "'hello'", ',', "'world'", ')']
      ],
      ['mixed with tabs', 'n\t:= \tp', ['n', ':=', 'p']]
    ] as [string, string, string[]][]).
      forEach((tuple: [string, string, string[]]) => {
        const [desc, toSplit, expectedSplit] = tuple;
        it(`splits "${desc}" correctly`, () => {
          expect(getTokens(toSplit)).toEqual(expectedSplit);
        });
      });
  });
});
