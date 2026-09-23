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

import { FunctionLookUpTable, ObjectType } from '../../src/function_type_build';
import { ContextBaseNamesSet } from '../../src/function_type_build/context_base_names_set';
import { ContextBaseStage, ContextLinkStage } from '../../src/function_type_build/context_build';
import { ContextFrameStack } from '../../src/function_type_build/context_frame_stack';
import { Helpers, raise } from '../../src/helpers';
import { AstFactories } from '../ast_factories';
import { TestHelpers } from '../test_helpers';

const { memoize, freeze } = Helpers;

const { describeNamed } = TestHelpers;

describeNamed({ ContextBaseNamesSet }, () => {
  const { makeFringe, makeFunctionDefinition } = AstFactories;
  let baseStagesMadeCount = 0;
  const makeBaseStage = (name: string): ContextBaseStage => {
    ++baseStagesMadeCount;
    return freeze({
      referenceType: memoize((): ObjectType => freeze({
        name: () => name,
        lookUp(_0: string | symbol): FunctionLookUpTable | undefined
          { return undefined; },
        detuplify: (): Readonly<ObjectType[]> | undefined => undefined,
        uid: memoize(Symbol),
        sizeInBytes: () => 0,
        sizeInStackItems: () => 0
      })),
      contextLinkStage(_0: Readonly<{ [name: string]: true }>,
                      _1: ContextFrameStack)
        : ContextLinkStage
      { raise('nope!'); }
    });
  };

  it('makes only one base stage per uid', () => {
    const oldCount = baseStagesMadeCount;
    const inst = ContextBaseNamesSet.forTesting.make(makeBaseStage);
    inst.ensure(0);
    inst.ensure(0);
    inst.ensure(1);
    expect(baseStagesMadeCount - oldCount).toEqual(2);
  });

  describe('eagerly adds child defs so pending names can work', () => {
    const innerMostNodes = memoize(() => [makeFringe('a')]);
    const innerMostDef = memoize(() => makeFunctionDefinition(...innerMostNodes()));
    const subNodes = memoize(() => [makeFunctionDefinition(innerMostDef())]);
    const rootNode = memoize(() => makeFunctionDefinition(...subNodes()));
    const inst = memoize(() => ContextBaseNamesSet.forTesting.make(makeBaseStage));

    it('grand parent will have parent as pending', () => {
      const { pendingNames } = inst().contextNamesFor(rootNode().uid(), subNodes());
      expect(pendingNames()).toEqual({ ['<parent>']: true });
    });

    it('inner most function has pending', () => {
      const { pendingNames } = inst().contextNamesFor(innerMostDef().uid(), innerMostNodes());
      expect(pendingNames()).toEqual({ ['<parent>']: true, ['.a']: true });
    });
  });
});
