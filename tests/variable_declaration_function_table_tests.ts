import { ReachPoint, TestHelpers } from './test_helpers';
import { VariableDeclarationFunctionTable } from '../src/variable_declaration_function_table';
import { IntegerType } from '../src/integer_type';
import { ObjectType } from '../src/object_type';
import { InterpretedCodeWriter } from '../src/interpreted_code_writer';
import { StringPool } from '../src/string_pool';
import { Helpers } from '../src/helpers';
import { CallingContext } from '../src/function_type';
import { VastNode } from '../src/vast_node';

const { freeze } = Helpers;
const { describeNamed } = TestHelpers;

describeNamed({ VariableDeclarationFunctionTable }, () => {
  const { make } = VariableDeclarationFunctionTable;
  const intType = IntegerType.instance();
  const { emptyTupleInstance, asTuple } = ObjectType;
  const makeSampleWriter = () =>
    InterpretedCodeWriter.make(StringPool.makeDefault());
  const { knowableLaterNode } = VastNode.forTesting;
  function specsForOneWordInSizeWithOffset(examplesOffset: number) {
    const subject = () => make(intType, ':=', knowableLaterNode(), examplesOffset);

    it('has a setter', () => {
      expect(subject().byParameters(intType)).toBeDefined();
    });

    it('has a getter', () => {
      expect(subject().byParameters(emptyTupleInstance())).toBeDefined();
    });

    it('will store exactly one "word"', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const writer = freeze({
        ...makeSampleWriter(),
        storeInteger(offset: number) {
          hitsAtExactly(1);
          expect(offset).toEqual(examplesOffset);
          return writer;
        },
      });
      subject().byParameters(intType)!.
        builtIn()(CallingContext.canTakeAll(), writer);
      expect(verifyHit()).toBeTruthy();
    });

    it('will load exactly one "word"', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const writer = freeze({
        ...makeSampleWriter(),
        loadInteger(offset: number) {
          hitsAtExactly(1);
          expect(offset).toEqual(examplesOffset);
          return writer;
        },
      });
      subject().
        byParameters(emptyTupleInstance())!.
        builtIn()(CallingContext.canTakeAll(), writer);
      expect(verifyHit()).toBeTruthy();
    });
  }
  
  describe('For a type one "word" in size, no offset', () => {
    specsForOneWordInSizeWithOffset(0);
  });

  describe('For a type one "word" in size, with offset', () => {
    specsForOneWordInSizeWithOffset(8);
  });

  describe('For a type that is multiple "words" large', () => {
    const subject = () => make(asTuple([intType, intType]), ':=', knowableLaterNode(), 0);

    it('will load exactly two "words"', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const writer = freeze({
        ...makeSampleWriter(),
        loadInteger(offset: number) {
          hitsAtExactly(2);
          // expect either 0 or 4 
          expect([0, 4].indexOf(offset)).not.toBe(-1);
          return writer;
        },
      });
      subject().
        byParameters(emptyTupleInstance())!.
        builtIn()(CallingContext.canTakeAll(), writer);
      expect(verifyHit()).toBeTruthy();
    });
  });
});
