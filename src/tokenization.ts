import { CharacterCrawler } from './tokenization/character_crawler';
import { CharacterClass } from './tokenization/character_class';
import { Helpers } from './helpers';
import { Token } from './token';
import { TokenRange } from './token_range';

const { memoize, freeze } = Helpers;

export interface Tokenization {
  tokenize: (input: string) => TokenRange
}

const getCharacterClassToTokenTypeMap = (() => {
  function makeCharacterClassToTokenTypeMap() {
    const { classes } = CharacterClass;
    const { types   } = Token;
    return freeze({
      [classes.numeric ]: (): symbol => types.integerLiteral,
      [classes.literal ]: (): symbol => types.stringLiteral ,
      [classes.spacious]: (): symbol =>
        { throw Error(`May not use whitespace as a token`); },
      [classes.newLine ]: (): symbol => types.newLine
    });
  }

  let sMap: { [charClass: symbol]: () => symbol } | undefined = undefined;
  return () => sMap ??= makeCharacterClassToTokenTypeMap();
})();

const class_ = freeze({
  defaultInjections: memoize(() => freeze({ CharacterCrawler, TokenRange })),
  make:
    ({ CharacterCrawler, TokenRange } = class_.defaultInjections()): Tokenization =>
    freeze({
      tokenize: (inp: string): TokenRange => {
        const rv: Token[] = [];
        const crawler = CharacterCrawler.make(inp);
        while (!crawler.reachedEnd()) {
          const readToken = crawler.crawl().readToken();
          rv.push(readToken);
        }
        return TokenRange.makeStartingRange(rv);
      }
    }),
  tokenTypeOfNonKeyword:
    (tokenContent: string, charClassClass = CharacterClass): symbol =>
  {
    const charClass = charClassClass.classOfNonKeyword(tokenContent);
    const getter =
      getCharacterClassToTokenTypeMap()[charClass] ?? 
      ((): symbol => Token.types.identifier);
    return getter();
  }
});

export const Tokenization = class_;

