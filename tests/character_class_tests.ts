import { TestHelpers } from './test_helpers';
import { CharacterClass } from '../src/character_class';

const { describeNamed } = TestHelpers;

describeNamed({ CharacterClass }, () => {
  describe('.classOf', () => {
    const { classOf, classes } = CharacterClass;

    it('numeric', () => {
      expect(classOf('1')).toEqual(classes.numeric);
    });

    it('alphabetic', () => {
      expect(classOf('q')).toEqual(classes.alphabetic);
    });

    it('operative', () => {
      expect(classOf(',')).toEqual(classes.operative);
    });

    it('spacious', () => {
      expect(classOf('\t')).toEqual(classes.spacious);
    });

    it('new line', () => {
      expect(classOf('\n')).toEqual(classes.newLine);
    });
  });
});
