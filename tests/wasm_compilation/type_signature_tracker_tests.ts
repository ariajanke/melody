import { TestHelpers } from '../test_helpers';
import { TypeSignatureTracker } from '../../src/wasm_compilation/type_signature_tracker';
import { WasmTypesSection } from '../../src/wasm_compilation/wasm_types_section';

const { describeNamed } = TestHelpers;

describeNamed({ TypeSignatureTracker }, () => {
  const { make } = TypeSignatureTracker;
  const { i32 } = WasmTypesSection.wasmTypes();
  describe('#makeIndexFor', () => {
    it('does not duplicate indicies for repeated calls', () => {
      const tst = make();
      const idx1 = tst.makeIndexFor([], []);
      const idx2 = tst.makeIndexFor([], []);
      expect(idx1).toEqual(idx2);
    });

    it('generates different indicies for different parameters', () => {
      const tst = make();
      const idx1 = tst.makeIndexFor([i32, i32], []);
      const idx2 = tst.makeIndexFor([i32], []);
      expect(idx1).not.toEqual(idx2);
    });

    it('generates different indicies for different results', () => {
      const tst = make();
      const idx1 = tst.makeIndexFor([], [i32]);
      const idx2 = tst.makeIndexFor([], [i32, i32]);
      expect(idx1).not.toEqual(idx2);
    });

    it('has no conflict when params/results are equal when concatenated', () => {
      const tst = make();
      const idx1 = tst.makeIndexFor([], [i32]);
      const idx2 = tst.makeIndexFor([i32], []);
      expect(idx1).not.toEqual(idx2);
    });

    it('has no conflict when params/results are equal when concatenated (none empty)', () => {
      const tst = make();
      const idx1 = tst.makeIndexFor([i32], [i32, i32]);
      const idx2 = tst.makeIndexFor([i32, i32], [i32]);
      expect(idx1).not.toEqual(idx2);
    });
  });
});
//  WebAssembly.instantiate(...WasmCodeWriter.make().makeCompilerFromCode().compile([]));