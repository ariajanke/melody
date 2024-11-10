import { TestHelpers } from '../test_helpers';
import { CharacterCrawler } from '../../src/tokenization/character_crawler';

const { describeNamed } = TestHelpers;

describeNamed({ CharacterCrawler }, () => {
  it('crawls an operator ":="', () => {
    const crawler = CharacterCrawler.make(':=');
    const token = crawler.crawl().readToken().content();
    expect(token).toEqual(':=');
  });

  it('skips whitespace', () => {
    const crawler = CharacterCrawler.make('   :=');
    const token = crawler.crawl().readToken().content();
    expect(token).toEqual(':=');
  });

  it('treats trailing whitespace as having reached the end', () => {
    const crawler = CharacterCrawler.make('a  ');
    crawler.crawl().readToken();
    expect(crawler.reachedEnd()).toBeTruthy();
  });

  it('crawls through the next token', () => {
    const crawler = CharacterCrawler.make("puts('hello')");
    const token = crawler.crawl().crawl().readToken().content();
    expect(token).toEqual('(');
  });

  it('crawls through a compact operative statement', () => {
    const crawler = CharacterCrawler.make('a*b');
    const opString = crawler.crawl().crawl().readToken().content();
    expect(opString).toEqual('*');
  });
});
