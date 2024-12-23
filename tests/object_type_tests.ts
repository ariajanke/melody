import { TestHelpers } from './test_helpers';
import { StringType } from '../src/string_type';
import { ObjectType } from '../src/object_type';

const { describeNamed } = TestHelpers;

describeNamed({ ObjectType }, () => {
  describe('tuple factory', () => {
    const strInst = StringType.instance;

    it('created tuple types decompose consistently', () => {
      const threeStrs = ObjectType.asTuple([strInst(), strInst(), strInst()]);
      const tupleType = ObjectType.asTuple([strInst(), strInst()]);
      expect(threeStrs.decompose()).toEqual([strInst(), strInst(), strInst()]);
      expect(tupleType.decompose()).toEqual([strInst(), strInst()]);
    });

    it('Always creates the same type uid for the same list of types', () => {
      const a = ObjectType.asTuple([strInst(), strInst()]);
      const b = ObjectType.asTuple([strInst(), strInst()]);
      expect(a.uid()).toEqual(b.uid());
    });
  });
});
