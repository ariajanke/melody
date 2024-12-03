import { WasmFunctionsSection } from '../../src/wasm_compilation/wasm_functions_section';
import { TestHelpers } from '../test_helpers';

const { describeNamed } = TestHelpers;

describeNamed({ WasmFunctionsSection }, () => {
  const { make } = WasmFunctionsSection;

  it('builds an empty functions index', () => {
    const expected = [
      0x03,
      0x01,
      0x00
    ];
    const res = make().finish();
    expect(res).toEqual(expected);
  });

  it('builds a function index with one function', () => {
    const expected = [
      0x03,
      0x02,
      0x01,
      0x02
    ];
    const res = make().pushSignatureFrom(2).finish();
    expect(res).toEqual(expected);
  });
});
