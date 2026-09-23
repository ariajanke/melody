/* Melody WASM Compiler
 *
 * Copyright (C) 2026 Aria Janke
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import { TestHelpers } from '../test_helpers';
import { Helpers } from '../../src/helpers';
import { OperatorStripping } from '../../src/ast_build/operator_stripping';
import { AstFactories } from '../ast_factories';
import { AstNode } from '../../src/ast_node';
import { OperatorNamingSchema } from '../../src/operator_naming_schema';
import { AstBuild_ } from '../../src/ast_build/ast_build_constructor_retrieval';
import { AstHelpers } from '../ast_helpers';

const { describeNamed } = TestHelpers;
const { memoize } = Helpers;

describeNamed({ OperatorStripping }, () => {
  const { makeFringe } = AstFactories;
  const puts = memoize(() => makeFringe('puts'));
  const emptyTuple = memoize(AstFactories.makeTuple);
  const makeCallMaker =
    (callName: string) =>
      (rec: AstNode, args: AstNode) =>
        AstFactories.makeCall(callName, rec, args);
  const makeBareCall = makeCallMaker(OperatorNamingSchema.kCall);
  const makeDotCall = makeCallMaker(OperatorNamingSchema.kDot);
  const makeAssignCall = makeCallMaker(OperatorNamingSchema.kAssignment);
  const aDotB = memoize(() => makeDotCall(makeFringe('a'), makeFringe('b')));

  function callsFromInst(inst: () => AstBuild_): string[] {
    return AstHelpers.callsFromInst(inst().node);
  }

  function identifiersFromInst(inst: () => AstBuild_): string[] {
    return AstHelpers.identifiersFromInst(inst().node);
  }

  function hasCorrectCalls(inst: () => AstBuild_, exCalls: Readonly<string[]>) {
    it('has correct calls', () => {
      const calls = callsFromInst(inst);
      expect(calls).toEqual(exCalls);
    });
  }

  function hasCorrectIdentifiers(inst: () => AstBuild_, exIds: Readonly<string[]>) {
    it('has correct identifiers', () => {
      const ids = identifiersFromInst(inst);
      expect(ids).toEqual(exIds);
    });
  }

  it('puts()', () => {
    const iast = memoize(() =>
      makeBareCall(puts(), emptyTuple()));
    const inst = OperatorStripping.make(iast());
    const calls = callsFromInst(() => inst);
    expect(calls).toEqual(['puts']);
  });

  describe('a.b.c', () => {    
    const iast = memoize(() => makeDotCall(aDotB(), makeFringe('c')));
    const inst = memoize(() => OperatorStripping.make(iast()));

    hasCorrectCalls(inst, ['.c', '.b']);

    hasCorrectIdentifiers(inst, ['a']);
  });

  describe('t.puts(a)', () => {
    const tDotPuts = () => makeDotCall(makeFringe('t'), puts());
    const callWithA = () => makeBareCall(tDotPuts(), makeFringe('a'));
    const inst = memoize(() => OperatorStripping.make(callWithA()));
    
    hasCorrectCalls(inst, ['puts']);

    hasCorrectIdentifiers(inst, ['t', 'a']);
  });

  describe('a.b(c).d', () => {
    const cDotD = () => makeDotCall(makeFringe('c'), makeFringe('d'));
    const iast = () => makeBareCall(aDotB(), cDotD());
    const inst = memoize(() => OperatorStripping.make(iast()));

    hasCorrectCalls(inst, ['b', '.d']);

    hasCorrectIdentifiers(inst, ['a', 'c']);
  });

  it('a := 5', () => {
    const iast = makeAssignCall(makeFringe('a'), makeFringe('5'));
    const inst = memoize(() => OperatorStripping.make(iast));
    const calls = callsFromInst(inst);
    expect(calls).toEqual(['a:=']);
  });

  describe('t.a := 5', () => {
    const tDotA = () => makeDotCall(makeFringe('t'), makeFringe('a'));
    const iast = () => makeAssignCall(tDotA(), makeFringe('5'));
    const inst = memoize(() => OperatorStripping.make(iast()));

    hasCorrectCalls(inst, ['a:=']);

    hasCorrectIdentifiers(inst, ['t']);
  });

  it('get_func()()', () => {    
    const firstCall = () => makeBareCall(makeFringe('get_func'), emptyTuple());
    const iast = () => makeBareCall(firstCall(), emptyTuple());
    const inst = memoize(() => OperatorStripping.make(iast()));
    const calls = callsFromInst(inst);
    expect(calls).toEqual([OperatorNamingSchema.kCall, 'get_func']);
  });

  it('foo() := 5', () => {
    const fooCall = () => makeBareCall(makeFringe('foo'), emptyTuple());
    const iast = () => makeAssignCall(fooCall(), makeFringe('5'));
    const inst = memoize(() => OperatorStripping.make(iast()));
    expect(inst().node()).toBeUndefined();
  });
});
