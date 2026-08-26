import { TestHelpers, ReachPoint } from '../test_helpers';
import { Token } from '../../src/token';
import { TokenRange } from '../../src/token_range';
import { BuildStateAddition, TreePartBuild, type BuildSink } from '../../src/iast_build/tree_part_build';
import { type IastNode } from '../../src/iast_node';
import { TokenFactories } from '../token_factories';
import { OperatorNamingSchema } from '../../src/operator_naming_schema';
import { ExpressionSegmentation, ParentheticalSegmentation } from '../../src/iast_build/scrap';
import { Helpers } from '../../src/helpers';

const { describeNamed } = TestHelpers;
const { freeze } = Helpers;

describeNamed({ ParentheticalSegmentation }, () => {
  // const makeToken = TokenFactories.makeFromStringOnly;
  const pos = () => 0;
  const opT: Token = freeze({
    start: pos,
    end: pos,
    content: () => 'op',
    type: () => Token.types.operator
  });
  const idT: Token = freeze({
    start: pos,
    end: pos,
    content: () => 'id',
    type: () => Token.types.identifier
  });
  const openT: Token = freeze({
    start: pos,
    end: pos,
    content: () => '(',
    type: () => Token.types.opening
  });
  const closeT: Token = freeze({
    start: pos,
    end: pos,
    content: () => ')',
    type: () => Token.types.closing
  });
  describe('stuff', () => {
    it('stuff', () => {
      const toks = [openT, idT, opT, openT, idT, opT, idT, closeT, idT, closeT, opT];
      const inst = ParentheticalSegmentation.make(toks, 0, toks.length);
      expect(inst.segment()).toBeDefined();
      expect(inst.segment()?.start()).toEqual(0);
      expect(inst.segment()?.end()).toEqual(10);
      if (inst.segment()) {
        expect(inst.segment()!.children().length).toEqual(1);
        expect(inst.segment()!.children()[0]?.start()).toEqual(3);
        expect(inst.segment()!.children()[0]?.end()).toEqual(8);
      }
    });
    it('segments multiple childred', () => {
      const inner = [openT, closeT];
      const toks = [openT, ...inner, idT, ...inner, closeT, idT];
      const inst = ParentheticalSegmentation.make(toks, 0, toks.length);
      expect(inst.segment()).toBeDefined();        
      expect(inst.segment()?.start()).toEqual(0);
      expect(inst.segment()?.end()).toEqual(7);
      if (inst.segment()) {
        const { children } = inst.segment()!;
        expect(children().length).toEqual(2);
        expect(children()[0]?.start()).toEqual(1);
        expect(children()[0]?.end()).toEqual(3);

        expect(children()[1]?.start()).toEqual(4);
        expect(children()[1]?.end()).toEqual(6);
      }
    });
  });
});
