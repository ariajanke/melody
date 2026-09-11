import { TestHelpers } from '../test_helpers';
import { Token, TokenType } from '../../src/token';
import { Helpers } from '../../src/helpers';
import { ParentheticalSegmentation } from '../../src/iast_build/parenthetical_segmentation';
import { Segment } from '../../src/iast_build/segment';
import { IastOperatorStripping } from '../../src/iast_build/iast_operator_stripping';
import { IastFragments } from '../iast_fragments';
import { IastNode } from '../../src/iast_node';
import { OperatorNamingSchema } from '../../src/operator_naming_schema';
import { ReseatableIastVisitor } from '../iast_visitor_factories';
import { IastBuild_ } from '../../src/iast_build/iast_build_constructor_retrieval';

const { describeNamed } = TestHelpers;
const { freeze, memoize } = Helpers;

describeNamed({ IastOperatorStripping }, () => {
  const makeVisitor = ReseatableIastVisitor.makeSelfModified;
  const makeDefaultVisitor = ReseatableIastVisitor.makeDefaultingToContinue;
  const { makeFringe } = IastFragments;
  const puts = memoize(() => makeFringe('puts'));
  const emptyTuple = memoize(IastFragments.makeTuple);
  const makeBareCall = (rec: IastNode, args: IastNode) =>
    IastFragments.makeCall(OperatorNamingSchema.kCall, rec, args);
  const makeDotCall = (rec: IastNode, args: IastNode) =>
    IastFragments.makeCall(OperatorNamingSchema.kDot, rec, args);
  
  // TODO DRY with AstExpressionCollector
  function callsFromInst(inst: () => IastBuild_): string[] {
    const { node } = inst();
    const calls: string[] = [];
    const visitor = makeVisitor({
      ...makeDefaultVisitor(),
      visitLet(innerNode: IastNode) {
        calls.push('let');
        innerNode.visit(visitor);
      },
      visitCall(callName: Token, receiver: IastNode, args: IastNode) {
        calls.push(callName.content());
        receiver.visit(visitor);
        args.visit(visitor);
      }
    });
    expect(node()).toBeDefined();
    node()?.visit(visitor);
    return calls;
  }

  it('puts()', () => {
    const iast = memoize(() =>
      makeBareCall(puts(), emptyTuple()));
    const inst = IastOperatorStripping.make(iast());
    // expect(inst.node()).toBeDefined();
    const calls = callsFromInst(() => inst);
    // const calls: string[] = [];
    // const visitor = makeVisitor({
    //   ...makeDefaultVisitor(),
    //   visitCall(callName: Token, receiver: IastNode, args: IastNode) {
    //     calls.push(callName.content());
    //     receiver.visit(visitor);
    //     args.visit(visitor);
    //   }
    // });
    // inst.node()?.visit(visitor);
    expect(calls).toEqual(['puts']);
  });
  it('a.b.c', () => {
    const aDotB = makeDotCall(makeFringe('a'), makeFringe('b'));
    const iast = memoize(() => makeDotCall(aDotB, makeFringe('c')));
    const inst = memoize(() => IastOperatorStripping.make(iast()));
    const calls = callsFromInst(inst);
    expect(calls).toEqual(['.a', '.b', '.c']);
  });
  it('t.puts(a)', () => {
    const tDotPuts = makeDotCall(makeFringe('t'), puts());
    const callWithA = makeBareCall(tDotPuts, makeFringe('a'));
    const inst = memoize(() => IastOperatorStripping.make(callWithA));
    const calls = callsFromInst(inst);
    expect(calls).toEqual(['puts']);
  });
  it('a.b(c).d', fail);
  it('a := 5', fail);
  it('t.a := 5', fail);
  it('get_func()()', fail);
  // sad path
  it('foo() := 5', fail);
});
