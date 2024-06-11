import { TestHelpers } from '../test_helpers';
import { CharacterClass } from '../../src/tokenization/character_class';

const { describeNamed } = TestHelpers;

describeNamed({ CharacterClass }, () => {
  describe('.classOf', () => {
    const { classOfString, classes } = CharacterClass;

    it('numeric', () => {
      expect(classOfString('1')).toEqual(classes.numeric);
    });

    it('alphabetic', () => {
      expect(classOfString('q')).toEqual(classes.alphabetic);
    });

    it('operative', () => {
      expect(classOfString(',')).toEqual(classes.operative);
    });

    it('spacious', () => {
      expect(classOfString('\t')).toEqual(classes.spacious);
    });

    it('new line', () => {
      expect(classOfString('\n')).toEqual(classes.newLine);
    });
  });
});
