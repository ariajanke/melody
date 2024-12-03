import { WasmImportsSection } from '../../src/wasm_compilation/wasm_imports_section';
import { TestHelpers } from '../test_helpers';

const { describeNamed } = TestHelpers;

describeNamed({ WasmImportsSection }, () => {
  const { make } = WasmImportsSection;
  it('builds empty imports', () => {
    const expected = [
      0x02,
      0x01,
      0x00
    ];
    const res = make().finish();
    expect(res).toEqual(expected);
  });

  it('builds import for one function', () => {
    const expected = [
      0x02,
      0x18,
      0x01,
      // "imports"
      0x07,
      0x69, 0x6d, 0x70, 0x6F, 0x72, 0x74, 0x73,
      // "printInteger"
      0x0C,
      0x70, 0x72, 0x69, 0x6E, 0x74, 0x49, 0x6E, 0x74, 0x65, // continued
      0x67, 0x65, 0x72,
      0x00, // kind for function
      0x01  // signature
    ];
    const res = make().pushFunction(1, 'imports', 'printInteger').finish();
    expect(res).toEqual(expected);
  });
});
