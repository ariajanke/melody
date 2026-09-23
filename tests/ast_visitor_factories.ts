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

import { Helpers } from '../src/helpers';
import { AstLiteralType, AstNode, AstVisitor, AstInitializerType } from '../src/ast_node';
import { Token } from '../src/token';

const { freeze } = Helpers;

export interface ReseatableAstVisitor extends AstVisitor {
  setInstRef(newInst: ReseatableAstVisitor): ReseatableAstVisitor
}

export const ReseatableAstVisitor = freeze({
  makeDefaultingToContinue(): ReseatableAstVisitor {
    let inst = ({
      visitLiteral(_0: Token, _1: AstLiteralType) {},
      visitFringe(_0: Token) {},
      visitTuple(nodes: Readonly<AstNode[]>)
        { nodes.forEach((v: AstNode) => v.visit(inst)); },
      visitInitializer(
        _0: Readonly<Token[]>,
        _1: AstInitializerType,
        value: AstNode)
      { value.visit(inst); },
      visitCall(_0: Token, receiver: AstNode, args: AstNode) {
        receiver.visit(inst);
        args.visit(inst);
      },
      visitFunctionDefinition(_0: number, nodes: Readonly<AstNode[]>) {
        nodes.forEach((v: AstNode) => v.visit(inst));
      },
      setInstRef(newInst: ReseatableAstVisitor): ReseatableAstVisitor {
        inst = newInst;
        return newInst;
      }
    });
    return inst;
  },
  makeSelfModified(visitor: ReseatableAstVisitor): ReseatableAstVisitor {
    return visitor.setInstRef(visitor);
  }
});
