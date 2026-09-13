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
  const makeCallMaker =
    (callName: string) =>
      (rec: IastNode, args: IastNode) =>
        IastFragments.makeCall(callName, rec, args);
  const makeBareCall = makeCallMaker(OperatorNamingSchema.kCall);
  const makeDotCall = makeCallMaker(OperatorNamingSchema.kDot);
  const makeAssignCall = makeCallMaker(OperatorNamingSchema.kAssignment);
  
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

  function identifiersFromInst(inst: () => IastBuild_): string[] {
    const strings: string[] = [];
    const visitor = makeVisitor({
      ...makeDefaultVisitor(),
      visitFringe(t: Token) {
        strings.push(t.content());
      }
    });
    const { node } = inst();
    expect(node()).toBeDefined();
    node()?.visit(visitor);
    return strings;
  }

  const aDotB = memoize(() => makeDotCall(makeFringe('a'), makeFringe('b')));
  function hasCorrectCalls(inst: () => IastBuild_, exCalls: Readonly<string[]>) {
    it('has correct calls', () => {
      const calls = callsFromInst(inst);
      expect(calls).toEqual(exCalls);
    });
  }
  function hasCorrectIdentifiers(inst: () => IastBuild_, exIds: Readonly<string[]>) {
    it('has correct identifiers', () => {
      const ids = identifiersFromInst(inst);
      expect(ids).toEqual(exIds);
    });
  }

  it('puts()', () => {
    const iast = memoize(() =>
      makeBareCall(puts(), emptyTuple()));
    const inst = IastOperatorStripping.make(iast());
    const calls = callsFromInst(() => inst);
    expect(calls).toEqual(['puts']);
  });


  describe('a.b.c', () => {    
    const iast = memoize(() => makeDotCall(aDotB(), makeFringe('c')));
    const inst = memoize(() => IastOperatorStripping.make(iast()));

    hasCorrectCalls(inst, ['.c', '.b']);

    hasCorrectIdentifiers(inst, ['a']);
  });

  describe('t.puts(a)', () => {
    const tDotPuts = () => makeDotCall(makeFringe('t'), puts());
    const callWithA = () => makeBareCall(tDotPuts(), makeFringe('a'));
    const inst = memoize(() => IastOperatorStripping.make(callWithA()));
    
    hasCorrectCalls(inst, ['puts']);

    hasCorrectIdentifiers(inst, ['t', 'a']);
  });

  describe('a.b(c).d', () => {
    const cDotD = () => makeDotCall(makeFringe('c'), makeFringe('d'));
    const iast = () => makeBareCall(aDotB(), cDotD());
    const inst = memoize(() => IastOperatorStripping.make(iast()));

    hasCorrectCalls(inst, ['b', '.d']);

    hasCorrectIdentifiers(inst, ['a', 'c']);
  });

  it('a := 5', () => {
    const iast = makeAssignCall(makeFringe('a'), makeFringe('5'));
    const inst = memoize(() => IastOperatorStripping.make(iast));
    const calls = callsFromInst(inst);
    expect(calls).toEqual(['a:=']);
  });

  describe('t.a := 5', () => {
    const tDotA = () => makeDotCall(makeFringe('t'), makeFringe('a'));
    const iast = () => makeAssignCall(tDotA(), makeFringe('5'));
    const inst = memoize(() => IastOperatorStripping.make(iast()));

    hasCorrectCalls(inst, ['a:=']);

    hasCorrectIdentifiers(inst, ['t']);
  });

  it('get_func()()', () => {    
    const firstCall = () => makeBareCall(makeFringe('get_func'), emptyTuple());
    const iast = () => makeBareCall(firstCall(), emptyTuple());
    const inst = memoize(() => IastOperatorStripping.make(iast()));
    const calls = callsFromInst(inst);
    expect(calls).toEqual([OperatorNamingSchema.kCall, 'get_func']);
  });

  it('foo() := 5', () => {
    const fooCall = () => makeBareCall(makeFringe('foo'), emptyTuple());
    const iast = () => makeAssignCall(fooCall(), makeFringe('5'));
    const inst = memoize(() => IastOperatorStripping.make(iast()));
    expect(inst().node()).toBeUndefined();
  });
});
