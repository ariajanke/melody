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

import { Helpers } from '../../src/helpers';
import { TestHelpers } from '../test_helpers';
import { NameExpressionBuild, NameExpressionOptions } from '../../src/ast_build/name_expression_build';
import { AstFactories } from '../ast_factories';
import { AstNode } from '../../src/ast_node';
import { Token } from '../../src/token';

const { memoize } = Helpers;

const { describeNamed } = TestHelpers;

describeNamed({ NameExpressionBuild }, () => {
  const tokenToString = (t: Token) => t.content();
  const { makeFringe, makeCall, makeTuple } = AstFactories;
  const defaultRecurseOn = (n: AstNode) => n;
  const makeInst = (node: () => AstNode, opt: NameExpressionOptions) =>
    memoize(() => NameExpressionBuild.make( node(), opt, defaultRecurseOn ));

  function isAValidNameExpression(inst: () => NameExpressionBuild) {
    it('is a valid name expression', () => {
      expect(inst().nameExpression()).toBeDefined();
    });
  }

  function hasNames(inst: () => NameExpressionBuild, exNames: string[]) {
    it(`has ${exNames.map(s => `"${s}"`).join(', ')} as its names`, () => {
      expect(inst().nameExpression()?.names.map(tokenToString)).toEqual(exNames);
    });
  }

  function hasValueNode(inst: () => NameExpressionBuild, vNode: () => AstNode) {
    it('has the correct value node', () => {
      expect(inst().nameExpression()?.value?.node.uid()).toEqual(vNode().uid());
    });
  }

  function hasTypeNode(inst: () => NameExpressionBuild, tNode: () => AstNode) {
    it('has the correct type node', () => {
      expect(inst().nameExpression()?.typeNode?.uid()).toEqual(tNode().uid());
    });
  }

  function noValueNode(inst: () => NameExpressionBuild) {
    it('has the correct value node', () => {
      expect(inst().nameExpression()).toBeDefined();
      expect(inst().nameExpression()?.value).toBeUndefined();
    });
  }

  function noTypeNode(inst: () => NameExpressionBuild) {
    it('has no type node', () => {
      expect(inst().nameExpression()).toBeDefined();
      expect(inst().nameExpression()?.typeNode).toBeUndefined();
    });
  }

  function hasError(inst: () => NameExpressionBuild, exError: string) {
    it('is not a valid name expression', () => {
      expect(inst().nameExpression()).toBeUndefined();
    });

    it(`has "${exError}" error`, () => {
      inst().nameExpression();
      expect(inst().error().message).toEqual(exError);
    });
  }

  describe('a = 1', () => {
    const valueNode = memoize(() => makeFringe('1'));
    const node = () => makeCall('=', makeFringe('a'), valueNode());
    const inst = makeInst(node, 'allow-value');

    isAValidNameExpression(inst);

    hasNames(inst, ['a']);

    hasValueNode(inst, valueNode);

    noTypeNode(inst);
  });

  describe('a = b = c', () => {
    const bEqC = memoize(() => makeCall('=', makeFringe('b'), makeFringe('c')));
    const node = () => makeCall('=', makeFringe('a'), bEqC());
    const inst = makeInst(node, 'allow-value');

    // NOTE
    // this is actually valid as a name expression
    // the reason for this is because that second "=" is taken as an equality test
    isAValidNameExpression(inst);

    hasNames(inst, ['a']);

    hasValueNode(inst, bEqC);

    noTypeNode(inst);
  });

  describe('a is Integer', () => {
    const typeNode = memoize(() => makeFringe('Integer'));
    const node = () => makeCall('is', makeFringe('a'), typeNode());
    const inst = makeInst(node, 'no-value');

    isAValidNameExpression(inst);

    hasNames(inst, ['a']);

    hasTypeNode(inst, typeNode);

    noValueNode(inst);
  });

  describe('a, b = 1, 2', () => {
    const aAndB = () => makeTuple([makeFringe('a'), makeFringe('b')]);
    const oneAndTwo = memoize(() => makeTuple([makeFringe('1'), makeFringe('2')]));
    const node = () => makeCall('=', aAndB(), oneAndTwo());
    const inst = makeInst(node, 'allow-value');
    
    isAValidNameExpression(inst);

    hasNames(inst, ['a', 'b']);

    hasValueNode(inst, oneAndTwo);

    noTypeNode(inst);
  });

  describe('t is Bungle or Beans = tree', () => {
    const bOrB = memoize(() =>
      makeCall('or', makeFringe('Bungle'), makeFringe('Beans')));
    const tIs = () => makeCall('is', makeFringe('t'), bOrB());
    const valueNode = memoize(() => makeFringe('tree'));
    const node = () => makeCall('=', tIs(), valueNode());
    const inst = makeInst(node, 'allow-value');
    
    isAValidNameExpression(inst);

    hasNames(inst, ['t']);

    hasTypeNode(inst, bOrB);

    hasValueNode(inst, valueNode);
  });

  describe('() = 1', () => {
    const node = () => makeCall('=', makeTuple([]), makeFringe('1'));
    const inst = makeInst(node, 'allow-value');
    
    hasError(inst, 'there must be at least one name');
  });

  describe('a, a, b = ...', () => {
    const aabTuple = () => makeTuple(['a', 'a', 'b'].map(makeFringe));
    const node = () => makeCall('=', aabTuple(), makeFringe('t'));
    const inst = makeInst(node, 'allow-value');
    
    hasError(inst, 'duplicate name "a" not allowed');
  });
});
