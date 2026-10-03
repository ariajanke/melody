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

import { AstNode } from '../../src/ast_node';
import { FunctionNamingSchema } from '../../src/function_naming_schema';
import { ObjectType } from '../../src/function_type_build';
import { IntegerType } from '../../src/function_type_build/integer_type';
import { NodeTypeEvaluation } from '../../src/function_type_build/node_type_evaluation';
import { TupleObjectType } from '../../src/function_type_build/tuple_object_type';
import { Helpers } from '../../src/helpers';
import { AstFactories } from '../ast_factories';
import { TestHelpers } from '../test_helpers';

const { memoize } = Helpers;

const { describeNamed } = TestHelpers;

describeNamed({ NodeTypeEvaluation }, () => {
  const { makeFringe, makeTuple, makeCall } = AstFactories;
  const intNode = memoize(() => makeFringe('Integer'));
  const intIntNode = memoize(() => makeTuple([intNode(), intNode()]));
  const contextNode = memoize(() => makeFringe(FunctionNamingSchema.kContextName));
  const singleTuple = memoize(() => makeCall('Tuple', contextNode(), intNode()));
  const multiTuple = memoize(() => makeCall('Tuple', contextNode(), intIntNode()));
  const makeInst = (node: AstNode) =>
    memoize(() => NodeTypeEvaluation.make(node));
  const intType = IntegerType.instance;
  const intIntTupleType = () => TupleObjectType.instanceFor([intType(), intType()]);

  function isType(inst: () => NodeTypeEvaluation, exType: ObjectType) {
    it('is defined', () => {
      expect(inst().objectType()).toBeDefined();
    });

    it(`is "${exType.name()}" type`, () => {
      expect(inst().objectType()?.uid()).toEqual(exType.uid());
    });
  }

  function hasError(inst: () => NodeTypeEvaluation, exError: string) {
    it(`has '${exError}' error`, () => {
      expect(inst().objectType()).toBeUndefined();
      expect(inst().error().message).toEqual(exError);
    });
  }

  describe('Integer', () => {
    const inst = makeInst(intNode());
    isType(inst, intType());
  });

  describe('Tuple(Integer)', () => {
    const inst = makeInst(singleTuple());
    isType(inst, intType());
  });

  describe('Tuple(Integer, Integer)', () => {
    const inst = makeInst(multiTuple());
    isType(inst, intIntTupleType());
  });

  describe('(Integer, Integer)', () => {
    const inst = makeInst(intIntNode());
    hasError(inst, 'cannot use multiple types for a parameter');
  });

  describe('NotAType', () => {
    const inst = makeInst(makeFringe('NotAType'));
    hasError(inst, 'Unrecognized type name "NotAType"');
  });
});
