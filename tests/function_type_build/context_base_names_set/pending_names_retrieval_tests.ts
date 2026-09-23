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

import {
  ChildFunctionDefinition,
  DeclarationNamesRetrieval,
  NameDeclaration,
  NameSet,
  WritableNameSet
} from '../../../src/function_type_build/context_base_names_set/declaration_names_retrieval';
import { PendingNamesRetrieval } from '../../../src/function_type_build/context_base_names_set/pending_names_retrieval';
import { Helpers, raise } from '../../../src/helpers';
import { AstInitializerType, AstNode } from '../../../src/ast_node';
import { AstFactories } from '../../ast_factories';
import { TestHelpers } from '../../test_helpers';

const { memoize, freeze } = Helpers;

const { describeNamed } = TestHelpers;

describeNamed({ PendingNamesRetrieval }, () => {
  const aNode = memoize((): AstNode => AstFactories.makeFringe('a'));
  const makeDecl = (names: Readonly<string[]>, type: AstInitializerType): NameDeclaration =>
    freeze({ names, type, value: aNode() });
  const makeUsedNames = (names: Readonly<string[]>): () => NameSet =>
    memoize((): NameSet => names.
      reduce(PendingNamesRetrieval.accumulateNames, {} as WritableNameSet));
  const makeChildDefs = (uids: Readonly<number[]>): () => Readonly<ChildFunctionDefinition[]> =>
    memoize((): Readonly<ChildFunctionDefinition[]> =>
      uids.map((uid: number) => freeze({ uid, nodes: [] })));
  const kDefaultDecls: DeclarationNamesRetrieval = freeze({
    declarations: memoize((): Readonly<NameDeclaration[]> => []),
    usedNames: memoize((): NameSet => ({})),
    childDefinitions: memoize((): Readonly<ChildFunctionDefinition[]> => [])
  });
  const kDefaultChildGetter = (_0: number) =>
    raise('no child getter set');
  const kDefaultIsBuiltin = (_0: string) => false;
  const makeInst =
    (mDeclNames: DeclarationNamesRetrieval,
     mIsBuiltinName: (name: string) => boolean = kDefaultIsBuiltin,
     mGetChildPending: (uid: number) => PendingNamesRetrieval = kDefaultChildGetter) =>
    memoize(() => PendingNamesRetrieval.make(mDeclNames, mIsBuiltinName, mGetChildPending));

  describe('for "pendingNames"', () => {
    it('builtin name gets filtered out', () => {
      const inst = makeInst(({
        ...kDefaultDecls,
        usedNames: makeUsedNames(['puts', 'a'])
      }),
      (name: string) => name === 'puts');
      expect(inst().pendingNames()).toEqual(['a']);
    });

    it('declaration filters out call for a name', () => {
      const inst = makeInst(({
        ...kDefaultDecls,
        usedNames: makeUsedNames(['f', 'a']),
        declarations: memoize(() => [makeDecl(['f'], '=')])
      }));
      expect(inst().pendingNames()).toEqual(['a']);
    });

    it('declaration filters out accessor', () => {
      const inst = makeInst(({
        ...kDefaultDecls,
        usedNames: makeUsedNames(['.f', 'a']),
        declarations: memoize(() => [makeDecl(['f'], '=')])
      }));
      expect(inst().pendingNames()).toEqual(['a']);
    });

    it('declaration filters out assignment', () => {
      const inst = makeInst(({
        ...kDefaultDecls,
        usedNames: makeUsedNames(['b:=', 'a']),
        declarations: memoize(() => [makeDecl(['b'], ':=')])
      }));
      expect(inst().pendingNames()).toEqual(['a']);
    });

    it('non-assignment declaration does not filter out assignment', () => {
      const inst = makeInst(({
        ...kDefaultDecls,
        usedNames: makeUsedNames(['b:=', 'a']),
        declarations: memoize(() => [makeDecl(['b'], '=')])
      }));
      expect(inst().pendingNames()).toEqual(['b:=', 'a']);
    });
  });

  describe('for "unclaimedNames"', () => {
    const makeChildGetter =
      (unclaimed: Readonly<string[]>, pendings: Readonly<string[]>): (uid: number) => PendingNamesRetrieval =>
    {
      const retr = memoize((): PendingNamesRetrieval => freeze({
        unclaimedNames: () => unclaimed,
        pendingNames: () => pendings,
        refersToParent: () => (unclaimed.length + pendings.length) > 0
      }));
      return (_0: number): PendingNamesRetrieval => retr();
    };

    it('has no children, when there are no child definitions', () => {
      const inst = makeInst(kDefaultDecls);
      expect(inst().unclaimedNames()).toEqual([]);
    });

    it('child pending name becomes an unclaimed name', () => {
      const inst = makeInst(({
          ...kDefaultDecls,
          childDefinitions: makeChildDefs([0])
        }),
        kDefaultIsBuiltin,
        makeChildGetter([], ['a']));
      expect(inst().unclaimedNames()).toEqual(['a']);
    });

    it('declaration filters out call for a name', () => {
      const inst = makeInst(({
          ...kDefaultDecls,
          declarations: memoize(() => [makeDecl(['f'], '=')]),
          childDefinitions: makeChildDefs([0])
        }),
        kDefaultIsBuiltin,
        makeChildGetter(['f', 'a'], []));
      expect(inst().unclaimedNames()).toEqual(['a']);
    });

    it('declaration filters out accessor', () => {
      const inst = makeInst(({
          ...kDefaultDecls,
          declarations: memoize(() => [makeDecl(['f'], '=')]),
          childDefinitions: makeChildDefs([0])
        }),
        kDefaultIsBuiltin,
        makeChildGetter(['.f', 'a'], []));
      expect(inst().unclaimedNames()).toEqual(['a']);
    });

    it('does not duplicate names', () => {
      const inst = makeInst(({
          ...kDefaultDecls,
          childDefinitions: makeChildDefs([0, 1, 2])
        }),
        kDefaultIsBuiltin,
        makeChildGetter(['a'], []));
      expect(inst().unclaimedNames()).toEqual(['a']);
    });
  });
});
