import { WasmHelpers } from '../../src/wasm_compilation/wasm_helpers';
import { TestHelpers } from '../test_helpers';

const { describeNamed } = TestHelpers;

describeNamed({ WasmHelpers }, () => {
  const { encodeVaruint32, encodeVarsint32 } = WasmHelpers;

  describeNamed({ encodeVaruint32 }, () => {
    ([
      [0, [0]],
      [1, [1]],
      [127, [127]],
      [128, [128, 1]],
      [255, [255, 1]],
      [256, [128, 2]]
    ] as [number, number[]][]).forEach(([input, expected]) => {
      it(`encodes ${input} as ${expected}`, () => {
        expect(encodeVaruint32(input)).toEqual(expected);
      });
    });
    it('throws on negative numbers', () => {
      expect(() => encodeVaruint32(-1)).toThrow();
    });
    it('throws on too large numbers', () => {
      expect(() => encodeVaruint32(0xFFFFFFFF + 1)).toThrow();
    });
  });

  describeNamed({ encodeVarsint32 }, () => {
    ([
      [0, [0]],
      [1, [1]],
      [-1, [254, 255, 255, 255, 15]],
      // penultimate bit test
      [127, [127, 0]],
      [-128, [0b00001111, 0b11111111, 0b11111111, 0b11111110, 0b11111111].reverse()],
      [128, [128, 1]]
    ] as [number, number[]][]).forEach(([input, expected]) => {
      it(`encodes ${input} as ${expected}`, () => {
        expect(encodeVarsint32(input)).toEqual(expected);
      });
    });
    it('throws on too large positive numbers', () => {
      expect(() => encodeVarsint32(0x7FFFFFFF + 1)).toThrow();
    });
    it('throws on too large negative numbers', () => {
      expect(() => encodeVarsint32(-0x80000000 - 1)).toThrow();
    });
  });
});