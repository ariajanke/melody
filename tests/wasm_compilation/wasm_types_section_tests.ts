import { TestHelpers } from '../test_helpers';
import { WasmTypesSection } from '../../src/wasm_compilation/wasm_types_section';

const { describeNamed } = TestHelpers;

describeNamed({ WasmTypesSection }, () => {
  const { i32 } = WasmTypesSection.wasmTypes();
  describe('#build', () => {
    it('does not create redundent types, for functions with parameters and results', () => {
      let ts = WasmTypesSection.make();
      ts = ts.pushFunction([i32, i32], [i32]);
      ts = ts.pushFunction([i32, i32], [i32]);
      expect(ts.typeCount()).toEqual(1);
    });

    it('does not create redundent types, for functions that take/return nothing', () => {
      let ts = WasmTypesSection.make();
      ts = ts.pushFunction([], []);
      ts = ts.pushFunction([], []);
      expect(ts.typeCount()).toEqual(1);
    });
  });
});
