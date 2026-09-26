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

import { AstNode, AstParameterExpression } from '../../src/ast_node';
import { ObjectType } from '../../src/function_type_build';
import { IntegerType } from '../../src/function_type_build/integer_type';
import { NodeTypeEvaluation } from '../../src/function_type_build/node_type_evaluation';
import { ParametersTypeBuild } from '../../src/function_type_build/parameters_type_build';
import { TupleObjectType } from '../../src/function_type_build/tuple_object_type';
import { Helpers, raise, StandardError } from '../../src/helpers';
import { AstFactories } from '../ast_factories';
import { TestHelpers } from '../test_helpers';
import { TokenFactories } from '../token_factories';

const { memoize, freeze } = Helpers;

const { describeNamed } = TestHelpers;

describeNamed({ ParametersTypeBuild }, () => {
  const { makeFringe } = AstFactories;
  const makeToken = TokenFactories.makeFromStringOnly;
  const intNode = memoize(() => makeFringe('intNode'));
  const threeTupleNode = memoize(() => makeFringe('threeTuple'));
  const failedNode = memoize(() => makeFringe('failed'));
  const kFailedNodeMessage = 'uh oh';
  const nodeToTypeBuild = (() => {
    const badError = StandardError.make().error;
    const intType = IntegerType.instance;
    const kMap: { [astNodeUid: number]: NodeTypeEvaluation } = freeze({
      [intNode().uid()]: freeze({
        objectType: intType,
        error: badError
      }),
      [threeTupleNode().uid()]: freeze({
        objectType: () => TupleObjectType.instanceFor([intType(), intType(), intType()]),
        error: badError
      }),
      [failedNode().uid()]: freeze({
        objectType: () => undefined,
        error: memoize(() => freeze({ message: kFailedNodeMessage }))
      }),
    });

    return (node: AstNode): NodeTypeEvaluation =>
      kMap[node.uid()] ?? raise('uh oh');
  })();

  function makeParameters
    (names: string[], typeNode: () => AstNode)
    : Readonly<AstParameterExpression[]>
  {
    return [{
      names: names.map(makeToken),
      typeNode: typeNode()
    }];
  };

  type NameObjectTypeFuncPairs = [string, () => ObjectType][];
  type NameObjectTypeUidPairs = [string, symbol][];

  function isValidRetrievalWithPairs
    (inst: () => ParametersTypeBuild, exPairs: NameObjectTypeFuncPairs)
  {
    it('is valid retrieval', () => {
      expect(inst().retrieval()).toBeDefined();
    });

    it('has correct name/object type pairs', () => {
      const pairs = inst().
        retrieval()?.
        orderedNameTypePairs()?.
        map((v: [string, ObjectType]) => [v[0], v[1].uid()]);
      const exUidPairs: NameObjectTypeUidPairs =
        exPairs.map((v: [string, () => ObjectType]) => [v[0], v[1]().uid()]);
      expect(pairs).toEqual(exUidPairs);
    });
  }

  function hasError(inst: () => ParametersTypeBuild, exError: string) {
    it('is not a valid retrieval', () => {
      expect(inst().retrieval()).toBeUndefined();
    });

    it(`has "${exError}" error`, () => {
      inst().retrieval();
      expect(inst().error().message).toEqual(exError);
    });
  }

  const makeInst = (names: string[], typeNode: () => AstNode) =>
    memoize((): ParametersTypeBuild =>
      ParametersTypeBuild.make(makeParameters(names, typeNode), nodeToTypeBuild));

  describe('single name, to single type', () => {
    const inst = makeInst(['a'], intNode);

    isValidRetrievalWithPairs(inst, [['a', IntegerType.instance]]);
  });

  describe('n names to n types (tuple)', () => {
    const inst = makeInst(['a', 'b', 'c'], threeTupleNode);

    isValidRetrievalWithPairs(inst, [
      ['a', IntegerType.instance],
      ['b', IntegerType.instance],
      ['c', IntegerType.instance],
    ]);
  });

  describe('n names to non-tuple type', () => {
    const inst = makeInst(['a', 'b'], intNode);

    hasError(inst, 'cannot break up non tuple type');
  });

  describe('n names to m (where m != n) types (tuple)', () => {
    const inst = makeInst(['a', 'b'], threeTupleNode);

    hasError(inst, 'tuple length does not match number of names');
  });

  describe('node type evaluation fails', () => {
    const inst = makeInst(['a'], failedNode);

    hasError(inst, kFailedNodeMessage);
  });
});
