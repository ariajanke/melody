import { WasmHelpers } from '../../src/wasm_compilation/wasm_helpers';
import { TestHelpers } from '../test_helpers';

const { describeNamed } = TestHelpers;

describeNamed({ WasmHelpers }, () => {
  describe('::encodeVaruint32', () => {
    const { encodeVaruint32 } = WasmHelpers;
    it('correctly encodes 0', () => {
      expect(encodeVaruint32(0)).toEqual([0]);
    });
    it('correctly encodes 1', () => {
      expect(encodeVaruint32(1)).toEqual([1]);
    });
    it('correctly encodes 256', () => {
      expect(encodeVaruint32(256)).toEqual([128, 2]);
    });
    it('correctly encodes 65536', () => {
      expect(encodeVaruint32(65536)).toEqual([128, 128, 4]);
    });
    it('correctly encodes 65536 + 1024', () => {
      expect(encodeVaruint32(65536 + 1024)).toEqual([128, 128 + 8, 4]);
    });
  });
  describe('::convertStringToNumbers', () => {
    const { convertStringToNumbers } = WasmHelpers;
    it('converts empty string into empty array', () => {
      expect(convertStringToNumbers('')).toEqual([]);
    });
    it('converts string into code point numbers array', () => {
      const cat = 'cat';
      const codePoints =
        [
          cat.codePointAt(0),
          cat.codePointAt(1),
          cat.codePointAt(2)
        ].map((n: number | undefined) => n ?? (() => {
          throw new Error('bad testing data');
        })());
      expect(convertStringToNumbers(cat)).toEqual(codePoints);
    });
  });
});
