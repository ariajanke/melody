import { TestHelpers } from '../test_helpers';
import { CrawlStrategies } from '../../src/tokenization/crawl_strategies';
import { CharacterClass } from '../../src/tokenization/character_class';

const { describeNamed } = TestHelpers;

describeNamed({ CrawlStrategies }, () => {
  const { alphabetic, literal, operative, spacious } = CharacterClass.classes;

  const crawlAlphanumeric = CrawlStrategies[alphabetic];
  const crawlOperator = CrawlStrategies[operative];
  const crawlStringLiteral = CrawlStrategies[literal];
  const crawlSpace = CrawlStrategies[spacious];

  describeNamed({ crawlAlphanumeric }, () => {
    ([
      ['asdf'  , 'end'],
      ['asdf ' , 'spaces'],
      ['asdf=' , 'operators'],
      ['asdf\'', 'quotations'],
      ['asdf\n', 'new line']
    ] as [string, string][]).
      forEach((pair: [string, string]) => {
        const [test, desc] = pair;
        it(`stops at ${desc}`, () => {
          expect(crawlAlphanumeric(test, 0)).toEqual(4);
        });
      });

    it('stops at end with numbers', () => {
      const str = 'asdf123';
      expect(crawlAlphanumeric(str, 0)).toEqual(str.length);
    });
  });

  describeNamed({ crawlOperator }, () => {
    ([
      [':=', 're-assignable'  , 2],
      ['= ', 'assignment'     , 1],
      ['+=', 'accumulate'     , 2],
      ['==', 'two assignments', 1],
      [',,', 'commas'         , 1],
      ['((', 'parens'         , 1]
    ] as [string, string, number][]).
      forEach((tuple: [string, string, number]) => {
        const [test, desc, expected] = tuple;
        it(`crawls out a: ${desc}`, () => {
          expect(crawlOperator(test, 0)).toEqual(expected);
        });
      });
  });

  describeNamed({ crawlSpace }, () => {
    ([
      ['  a'  , 'alphabetic'   ],
      ['  '   , 'end'          ],
      ['\t\r=', 'at operator with other whitespace'],
      ['  +'  , 'operator'     ],
      ['  1'  , 'numeric'      ],
      ['  \n' , 'new line'     ]
    ] as [string, string][]).
      forEach((pair: [string, string]) => {
        const [test, desc] = pair;
        it(`stops at ${desc}`, () => {
          expect(crawlSpace(test, 0)).toEqual(2);
        });
      });
  });

  describeNamed({ crawlStringLiteral }, () => {
    it('crawls stopping at nothing but another "\'"', () => {
      const str = "'hello {\" \\\\''";
      const end = crawlStringLiteral(str, 0);
      expect(str.substring(0, end)).toEqual(`'hello {" \\\\'`);
    });
  });
});
