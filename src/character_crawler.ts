import { CrawlStrategies } from './crawl_strategies';
import { CharacterClass } from './character_class';
import { Token } from './token';

export interface CharacterCrawler {
  readToken: () => Token,
  reachedEnd: () => boolean,
  crawl: () => CharacterCrawler
};

export const CharacterCrawler = (() => {
  const { freeze } = Object;

  const injections = freeze({
    CrawlStrategies,
    characterClassOf: CharacterClass.classOf,
    characterClasses: CharacterClass.classes
  });

  function make
    (mInput: string,
     { CrawlStrategies, characterClassOf, characterClasses } = injections)
  {
    const inst = freeze({ reachedEnd, readToken, crawl });

    let mStart = 0;
    let mEnd = 0;
    let mReadToken = Token.kBlankToken;

    function readToken(): Token { return mReadToken; }

    function reachedEnd(): boolean { return mEnd === mInput.length; }

    function crawledThrough(): void {
      if (mStart >= mInput.length) {
        throw Error('Cannot crawl at end of string');
      }

      const charClass = characterClassOf(mInput[mEnd]);
      if (mReadToken.content() !== '' &&
          charClass !== characterClasses.spacious)
      {
        return;
      }
      const crawlFn = CrawlStrategies[charClass];
      const next = crawlFn(mInput, mEnd);
      if (next <= mEnd) {
        throw Error('progression failed');
      }
      mEnd = next;
      if (charClass !== characterClasses.spacious) {
        // maybe have columnStart in the future
        mReadToken = Token.make(mInput, mStart, mEnd);
      }
      mStart = mEnd;

      return;
    }

    function crawl() {
      mReadToken = Token.kBlankToken;
      while (mReadToken.content() === '') {
        crawledThrough();
      }
      if (mStart < mInput.length) {
        crawledThrough();
      }
      return inst;
    }

    return inst;
  }

  return freeze({ make });
})();
