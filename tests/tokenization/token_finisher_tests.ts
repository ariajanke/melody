/* Melody WASM Compiler
 *
 * Copyright (C) 2026 Aria Janke
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import { Helpers } from '../../src/helpers';
import { OperatorNamingSchema } from '../../src/operator_naming_schema';
import { Token, TokenType } from '../../src/token';
import { Tokenization } from '../../src/tokenization';
import { TokenFinisher } from '../../src/tokenization/token_finisher';
import { TestHelpers } from '../test_helpers';

const { describeNamed } = TestHelpers;
const { freeze } = Helpers;

describeNamed({ TokenFinisher }, () => {
  const makeSample = (() => {
    let sSumLength = 0;  
    return (content: string, type: TokenType): Token => {  
      const pos = sSumLength;
      sSumLength += content.length;
      return freeze({
        type: () => type,
        content: () => content,
        start: () => pos,
        end: () => pos + content.length
      });
    };
  })();
  const kEscape = makeSample('\\', Token.types.operator);
  const kNewLine = makeSample('\n', Token.types.grouping.separator);
  const kAIdentifier = makeSample('a', Token.types.identifier);
  const kOperator = makeSample('+', Token.types.operator);
  const kEmptyString = makeSample('', Token.types.literal.string);
  const kConcat = makeSample('{', Token.types.concatenation);
  const kNonEmptyString = makeSample('meow', Token.types.literal.string);
  const kFuncId = makeSample('foo', Token.types.identifier);
  const kFuncOpening = makeSample('(', Token.types.grouping.opening);
  const kFarOffOpening = makeSample('(', Token.types.grouping.opening);

  const intoFinishedTokens = (toks: Readonly<Token[]>): Readonly<Token[]> =>
    TokenFinisher.make(toks).finishedTokens();
  const intoFinishedContent = (toks: Readonly<Token[]>): Readonly<string[]> =>
    intoFinishedTokens(toks).map(t => t.content());
  const intoFinishedLengths = (toks: Readonly<Token[]>): Readonly<number[]> =>
    intoFinishedTokens(toks).map(t => Token.lenOf(t));

  function tokensFromString(str: string): Readonly<Token[]> {
    const tokeniz = Tokenization.
      make(str, (toks: Readonly<Token[]>) => freeze({ finishedTokens: () => toks }));
    return tokeniz.tokens();
  }

  describe('cancellations', () => {
    it('cancels escape + new line', () => {
      const contents = intoFinishedContent([kEscape, kNewLine, kNewLine]);
      expect(contents).toEqual(['\n']);
    });

    it('cancels new line + new line', () => {
      const contents = intoFinishedContent([kNewLine, kNewLine, kAIdentifier]);
      expect(contents).toEqual(['\n', 'a']);
    });

    it('cancels concat + empty string', () => {
      const contents = intoFinishedContent([kAIdentifier, kConcat, kEmptyString, kOperator]);
      expect(contents).toEqual(['a', '+']);
    });

    it('cancels empty string + concate', () => {
      const contents = intoFinishedContent([kAIdentifier, kConcat, kEmptyString, kOperator]);
      expect(contents).toEqual(['a', '+']);
    });

    it('does not cancel concat with non empty string', () => {
      const contents = intoFinishedContent([kAIdentifier, kConcat, kNonEmptyString]);
      expect(contents).toEqual(['a', '{', 'meow']);
    });

    it('does not cancel concat resulting in empty string completely', () => {
      const contents = intoFinishedContent([
        kOperator, kEmptyString, kConcat, kEmptyString, kNewLine
      ]);
      expect(contents).toEqual(['+', '', '\n']);
    });
  });

  describe('emissions', () => {
    it('emits call for "foo()"', () => {
      const contents = intoFinishedContent([
        kFuncId, kFuncOpening
      ]);
      expect(contents).toEqual(['foo', OperatorNamingSchema.kCall, '(']);
    });

    it('does not emit call when opening is far off', () => {
      const contents = intoFinishedContent([
        kFuncId, kFarOffOpening
      ]);
      expect(contents).toEqual(['foo', '(']);
    });
  });

  describe('modification', () => {
    it('(does not) extend new line for "short/zero" lengths', () => {
      const lengths = intoFinishedLengths([kNewLine, kAIdentifier]);
      expect(lengths).toEqual([1, 1]);
    });

    it('extends new lines for longer lengths', () => {
      const lengths = intoFinishedLengths([kNewLine, kFarOffOpening]);
      const diff = kFarOffOpening.start() - kNewLine.end();
      expect(lengths).toEqual([1 + diff, 1]);
    });

    it('extension affects content string', () => {
      const contents = intoFinishedContent(tokensFromString('\n  cool_stuff'));
      expect(contents).toEqual(['\n  ', 'cool_stuff']);
    });

    it('extension replaces other characters', () => {
      const contents = intoFinishedContent(tokensFromString('\n #{}more_stuff'));
      expect(contents).toEqual(['\n    ', 'more_stuff']);
    });
  });
});
