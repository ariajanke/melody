import { TestHelpers } from '../test_helpers';
import { WasmCodeSection } from '../../src/wasm_compilation/wasm_code_section';
import { WasmFunctionBody } from '../../src/wasm_compilation/wasm_function_body';

const { describeNamed } = TestHelpers;

describeNamed({ WasmCodeSection }, () => {
  const { make } = WasmCodeSection;
  describe('#finish', () => {
    it('builds correct code section with no functions', () => {
      const expected = [
        0x0A,
        0x01,
        0x00
      ];
      const res = make().finish();
      expect(res).toEqual(expected);
    });

    it('builds correct code section with an empty function', () => {
      let wcs = make();
      wcs = wcs.pushFunctionBody( WasmFunctionBody.make() );
      const producedCode = [
        0x0A,
        0x04,
        0x01,
        0x02,
        0x00,
        0x0B
      ];
      const res = wcs.finish();
      expect(res).toEqual(producedCode);
    });
  });
});
