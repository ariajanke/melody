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

import { FunctionNamingSchema } from '../../../src/function_naming_schema';
import {
  DeclarationNamesRetrieval,
} from '../../../src/function_type_build/context_base_names_set/declaration_names_retrieval';
import { Helpers } from '../../../src/helpers';
import { AstNode } from '../../../src/ast_node';
import { AstFactories } from '../../ast_factories';
import { TestHelpers } from '../../test_helpers';

const { memoize } = Helpers;

const { describeNamed } = TestHelpers;

describeNamed({ DeclarationNamesRetrieval }, () => {
  const { makeCall, makeFringe, makeInitializer, makeFunctionDefinition } = AstFactories;
  const contextFringe = memoize((): AstNode =>
    makeFringe(FunctionNamingSchema.kContextName));
  const tNode = memoize((): AstNode => makeFringe('t'));
  const emptyNode = AstFactories.emptyTupleInstance;
  const makeInst = (nodes: Readonly<AstNode[]>) =>
    memoize(() => DeclarationNamesRetrieval.make(nodes));
  const simpleDefNode = memoize(makeFunctionDefinition);

  it('skips non-context call names', () => {
    const inst = makeInst([
      makeCall('beans', contextFringe(), emptyNode()),
      makeCall('member', tNode(), emptyNode())
    ]);
    expect(inst().usedNames()).toEqual({ ['beans']: true, ['.t']: true });
  });

  it('non-context fringes are added', () => {
    const inst = makeInst([
      contextFringe(),
      tNode()
    ]);
    expect(inst().usedNames()).toEqual({ ['.t']: true });
  });

  it('adds initializers', () => {
    const inst = makeInst([ makeInitializer(['a'], '=', tNode()) ]);
    expect(inst().declarations().length).toEqual(1);
    expect(inst().declarations()[0]?.names).toEqual(['a']);
    expect(inst().declarations()[0]?.type).toEqual('=');
    expect(inst().declarations()[0].value.uid()).toEqual(tNode().uid());
  });

  it('adds function definition', () => {
    
    const inst = makeInst([ simpleDefNode() ]);
    expect(inst().childDefinitions().length).toEqual(1);
    expect(inst().childDefinitions()[0]?.uid).toEqual(simpleDefNode().uid());
  });

  it('does not recur for function definitions', () => {
    const outerDefNode = memoize(() => makeFunctionDefinition(simpleDefNode()));
    const inst = makeInst([ outerDefNode() ]);
    expect(inst().childDefinitions().length).toEqual(1);
    expect(inst().childDefinitions()[0]?.uid).toEqual(outerDefNode().uid());
  });
});
