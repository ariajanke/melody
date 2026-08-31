import { TestHelpers } from './test_helpers';
import { Tokenization } from '../src/tokenization';
import { TokenType } from '../src/token';
import { OperatorNamingSchema } from '../src/operator_naming_schema';

const { describeNamed } = TestHelpers;

describeNamed({ Tokenization }, () => {
  type ContentTokenCase = [string, string, string[]];
  type ContentTokenCaseSet = Readonly<ContentTokenCase[]>;
  type TypeTokenCase = [string, string, TokenType[]];
  type TypeTokenCaseSet = Readonly<TypeTokenCase[]>;
  const getTokens = (inp: string): string[] =>
    Tokenization.make(inp).tokens().map(t => t.content());

  function doContentSplitTestsFor(set: ContentTokenCaseSet) {
    set.forEach((tuple: [string, string, string[]]) => {
      const [desc, toSplit, expectedSplit] = tuple;
      it(`${desc} content`, () => {
        expect(getTokens(toSplit)).toEqual(expectedSplit);
      });
    });
  }

  function doTypeSplitTestsFor(set: TypeTokenCaseSet) {
    set.forEach((tuple: TypeTokenCase) => {
      const [desc, toSplit, expectedTypes] = tuple;
      it(`${desc} types`, () => {
        const types = Tokenization.make(toSplit).tokens().map(t => t.type());
        expect(types).toEqual(expectedTypes);
      });
    });
  }

  it('splits a hello world program', () => {
    expect(getTokens("puts('hello')")).
      toEqual(['puts', OperatorNamingSchema.kCall, '(', 'hello', ')']);
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
    doContentSplitTestsFor([
      [
        'spaces',
        "puts ('hello',   'world')  ",
        ['puts', '(', 'hello', ',', 'world', ')']
      ],
      [
        'mixed with tabs',
        'n\t:= \tp',
        ['n', ':=', 'p']
      ]
    ] as [string, string, string[]][]);
  });

  describe('new lines', () => {
    doContentSplitTestsFor([
      [
        'basic line breaking',
        'a\nb\nc',
        ['a', '\n', 'b', '\n', 'c']
      ],
      [
        'multi-character line breaking',
        'a\nb\n\nc\r\nd',
        ['a', '\n', 'b', '\n', 'c', '\n', 'd']
      ],
      [
        'explicit line continuation',
        'a \\\n b',
        ['a', 'b']
      ],
      [
        'does not incorrectly continue line with other tokens',
        'a \\ b \n c',
        ['a', 'b', '\n ', 'c']
      ],
      [
        'line continuation with stuff in the way',
        'a \\ # wow a comment!\nb',
        ['a', 'b']
      ],
      [
        'new lines with indentation information',
        'a\n b\n  c\n d',
        ['a', '\n ', 'b', '\n  ', 'c', '\n ', 'd']
      ],
      [
        'identation and multi-characters',
        'a\r\n b\n\r c',
        ['a', '\n ', 'b', '\n\r ', 'c']
      ],
      [
        'comment becomes part of the indentation',
        'a\n#{ }b',
        ['a', '\n#{ }', 'b']
      ]
    ] as [string, string, string[]][]);
    doTypeSplitTestsFor([
      [
        'comment becomes part of the indentation',
        'fn()\n#{ :3 } let b',
        [
          'opening', 'opening', 'closing', 'separator',
          'operator', 'identifier'
        ]
      ]
    ]);
  });

  describe('strings', () => {
    doContentSplitTestsFor([
      [
        'typical string',
        `a = 'hello'`,
        ['a', '=', 'hello']
      ],
      [
        'does not omit an empty string, just because it is empty',
        `a = ''`,
        ['a', '=', ''],
      ],
      [
        'escaped string',
        `foo('\\'\\#{')`,
        ['foo', OperatorNamingSchema.kCall, '(', `\\'\\#{`, ')']
      ],
      [
        'string interpolation',
        `foo('Good #{tod} to you!')`,
        ['foo', OperatorNamingSchema.kCall, '(', 'Good ', '#{', 'tod', '}', ' to you!', ')']
      ],
      [
        'complex string interpolation',
        `'There are a total of #{ cats*4 + 2 } toe beans!'`,
        ['There are a total of ', '#{', 'cats', '*', '4', '+', '2', '}', ' toe beans!']
      ],
      [
        'nested interpolation',
        `'b#{'hello #{name}'}'`,
        ['b', '#{', 'hello ', '#{', 'name']
      ]
    ] as [string, string, string[]][]);
    doTypeSplitTestsFor([
      [
        'string interpolation',
        `'#{nutrient} can be found in #{food}'`,
        [
          'identifier', 'concatenation', 'string', 'concatenation', 'identifier'
        ]
      ]
    ]);
    it('raises unclassifiable after string closes', () => {
      expect(() => {
        getTokens(`'hello #{mario} #{bees}' }`);
      }).toThrowError('unexpected unclassifiable character');
    });
  });

  describe('numeric and hash literals', () => {
    doContentSplitTestsFor([
      [
        'typical integer',
        'a = 123',
        ['a', '=', '123']
      ],
      [
        'negative integer',
        'b > -12',
        ['b', '>', '-12']
      ],
      [
        'typical decimal',
        'a + -12.8',
        ['a', '+', '-12.8']
      ],
      [
        'hash literal',
        'color := #333 # funny little comment',
        ['color', ':=', '333']
      ],
      
    ] as [string, string, string[]][]);
    doTypeSplitTestsFor([
      [
        'hash literal',
        'color := #333',
        ['identifier', 'operator', 'hash']
      ],
      [
        'integer with call',
        '12.to_string()',
        ['numeric', 'operator', 'identifier', 'operator', 'opening', 'closing']
      ],
      [
        'decimal with call',
        '12.0.to_string()',
        ['numeric', 'operator', 'identifier', 'operator', 'opening', 'closing']
      ]
    ]);
  });

  describe('comments', () => {
    doContentSplitTestsFor([
      [
        'the shebang comment',
        '#!/somewhere/stuff\nhello()',
        ['\n', 'hello', OperatorNamingSchema.kCall, '(', ')']
      ],
      [
        'typical comment',
        'pea_soup# am I sure about this?\nbeans',
        ['pea_soup', '\n', 'beans']
      ],
      [
        'typical comment with space',
        'foo # more spacious\n  bar',
        ['foo', '\n  ', 'bar']
      ],
      [
        'mid line comment',
        'a + #{ hey there ;) } c',
        ['a', '+', 'c']
      ]
    ] as [string, string, string[]][]);
  });

  describe('the token literal (dollar marker)', () => {
    doContentSplitTestsFor([
      [
        'typical case',
        '$<context> .peas',
        ['<context>', '.', 'peas']
      ],
      [
        'capture operator',
        '$+ = fn',
        ['+', '=', 'fn']
      ]
    ] as [string, string, string[]][]);
    doTypeSplitTestsFor([
      [
        'typical case',
        '$<context> .peas',
        ['identifier', 'operator', 'identifier']
      ],
      [
        'capture operator',
        '$+ = fn',
        ['identifier', 'operator', 'opening']
      ]
    ]);
  });

  describe('groupings', () => {
    doTypeSplitTestsFor([
      [
        'groupings are identified correctly',
        'tbl \n a = fn () ~ \n ~',
        [
          'opening', 'separator',
          'identifier', 'operator', 'opening',
          'opening', 'closing', 'closing', 'separator',
          'closing'
        ]
      ],
    ]);
  });
});
