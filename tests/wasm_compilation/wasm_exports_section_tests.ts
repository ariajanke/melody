import { WasmExportsSection } from '../../src/wasm_compilation/wasm_exports_section';
import { TestHelpers } from '../test_helpers';

const { describeNamed } = TestHelpers;

describeNamed({ WasmExportsSection }, () => {
  const { make } = WasmExportsSection;
  describe('#finish', () => {
    it('builds an empty exports section', () => {
      const expected = [
        0x07,
        0x01,
        0x00, // no export
      ];
      const res = make().finish();
      expect(res).toEqual(expected);
    });

    it('builds an exports section exporting an "entry" function', () => {
      let wes = make();
      const expected = [
        0x07,
        0x09,
        0x01, // one export
        0x05, // length of "entry"
        0x65, 0x6E, 0x74, 0x72, 0x79, // "entry"
        0x00, // export kind
        0x04  // export function index
      ];
      wes = wes.pushFunction('entry', 4);
      const res = wes.finish();
      expect(res).toEqual(expected);
    });
  });
});
