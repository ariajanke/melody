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
      it(`encodes ${input} as expected`, () => {
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
      [127, [255, 0]],
      [-128, [0b00001111, 0b11111111, 0b11111111, 0b11111110, 0b11111111].reverse()],
      [128, [128, 1]]
    ] as [number, number[]][]).forEach(([input, expected]) => {
      it(`encodes ${input} as expected`, () => {
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