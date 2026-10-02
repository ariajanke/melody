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

import { Helpers, raise } from '../helpers';
import { AstDefinition } from './ast_other_nodes';
import { AstNode_, AstVisitor_ } from './ast_types';

interface AstTuple extends AstNode_ {
  kIsATuple: symbol;
  append(n: AstNode_): void;
  detuplify(): Readonly<AstNode_[]>;
};

const { freeze } = Helpers;
const { makeUid } = AstDefinition;
const kIsATuple = Symbol();
const nodeAsString = (n: AstNode_) => n.asString();

function asTuple(n: AstNode_): AstTuple | undefined {
  if ('kIsATuple' in n && n.kIsATuple === kIsATuple) {
    return n as AstTuple;
  }

  return undefined;
}

function merge_
  (n1: AstNode_, considerN1: boolean,
   n2: AstNode_, considerN2: boolean): AstNode_
{
  const n1AsT = considerN1 && asTuple(n1);
  const n2AsT = considerN2 && asTuple(n2);
  if (n1AsT && n2AsT) {
    n2AsT.detuplify().forEach(n1AsT.append);
    return n1AsT;
  } else if (n1AsT) {
    n1AsT.append(n2);
    return n1AsT;
  } else if (n2AsT) {
    return AstTuple.make([n1, ...n2AsT.detuplify()]);
  }

  return AstTuple.make([n1, n2]);
}

function mergeBoth(n1: AstNode_, n2: AstNode_): AstNode_
  { return merge_(n1, true, n2, true); }

function mergeLeft(n1: AstNode_, n2: AstNode_): AstNode_
  { return merge_(n1, true, n2, false); }

function mergeRight(n1: AstNode_, n2: AstNode_): AstNode_
  { return merge_(n1, false, n2, true); }

export const AstTuple = freeze({
  mergeBoth,
  mergeLeft,
  mergeRight,
  // tuplify(tOrN1: AstNode_ | AstTuple, n2: AstNode_): AstNode_ {
  //   console.log('tuplifying', 'kIsATuple' in tOrN1 ? 'apending' : 'making');
  //   console.log('the other was: ', 'kIsATuple' in n2 ? 'a tuple' : 'non-tuple');
  //   if ('kIsATuple' in tOrN1 && tOrN1.kIsATuple === kIsATuple) {
  //     const temp = tOrN1;
  //     temp.append(n2);
  //     return temp;
  //   } else {
  //     return AstTuple.make([tOrN1, n2]);
  //   }
  // },
  detuplify(n: AstNode_ | AstTuple): Readonly<AstNode_[]> | undefined {
    if ('kIsATuple' in n && n.kIsATuple === kIsATuple) {
      return n.detuplify();
    }

    return undefined;
  },
  make(mMembers: AstNode_[] = []): AstTuple {
    function verifyNotSelfNested() {
      for (let i = 0; i < mMembers.length; ++i) {
        const node = mMembers[i];
        if ('kIsATuple' in node && node.kIsATuple === kIsATuple) {
          if ((node as AstTuple).uid() === inst.uid()) {
            raise('must not self nest tuple');
          }
        }
      }
    }

    const inst = freeze({
      kIsATuple,
      detuplify: (): Readonly<AstNode_[]> => mMembers,
      append(n: AstNode_) {
        mMembers.push(n);
        verifyNotSelfNested();
      },
      visit: <T>(visitor: AstVisitor_<T>): T =>
        visitor.visitTuple(mMembers),
      asString: () =>
        `Tuple { ${mMembers.map(nodeAsString).join(', ')} }`,
      uid: makeUid()
    });
    verifyNotSelfNested();
    return inst;
  }
});
