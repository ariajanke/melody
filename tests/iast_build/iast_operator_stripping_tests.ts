import { TestHelpers } from '../test_helpers';
import { Helpers } from '../../src/helpers';
import { IastOperatorStripping } from '../../src/iast_build/iast_operator_stripping';
import { IastFactories } from '../iast_factories';
import { IastNode } from '../../src/iast_node';
import { OperatorNamingSchema } from '../../src/operator_naming_schema';
import { IastBuild_ } from '../../src/iast_build/iast_build_constructor_retrieval';
import { IastHelpers } from '../iast_helpers';

const { describeNamed } = TestHelpers;
const { memoize } = Helpers;

describeNamed({ IastOperatorStripping }, () => {
  const { makeFringe } = IastFactories;
  const puts = memoize(() => makeFringe('puts'));
  const emptyTuple = memoize(IastFactories.makeTuple);
  const makeCallMaker =
    (callName: string) =>
      (rec: IastNode, args: IastNode) =>
        IastFactories.makeCall(callName, rec, args);
  const makeBareCall = makeCallMaker(OperatorNamingSchema.kCall);
  const makeDotCall = makeCallMaker(OperatorNamingSchema.kDot);
  const makeAssignCall = makeCallMaker(OperatorNamingSchema.kAssignment);
  const aDotB = memoize(() => makeDotCall(makeFringe('a'), makeFringe('b')));

  function callsFromInst(inst: () => IastBuild_): string[] {
    return IastHelpers.callsFromInst(inst().node);
  }

  function identifiersFromInst(inst: () => IastBuild_): string[] {
    return IastHelpers.identifiersFromInst(inst().node);
  }

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
