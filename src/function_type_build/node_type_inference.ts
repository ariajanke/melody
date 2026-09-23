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

import { AstInitializerType, AstLiteralType, AstNode, AstVisitor } from '../ast_node';
import { FunctionNamingSchema } from '../function_naming_schema';
import { ObjectType } from '../function_type_build';
import { Helpers } from '../helpers';
import { Token } from '../token';
import { ConstantStringType } from './builtin_type_base';
import { FunctionIndexType } from './function_index_type';
import { IntegerType } from './integer_type';
import { TupleObjectType } from './tuple_object_type';
import { TypeRepresentationInstance, TypeRepresentationType } from './type_representation_type';

const { freeze } = Helpers;

export interface NodeTypeInference {
  representationFor(node: AstNode): TypeRepresentationInstance
};

function make
  (mContextType: ObjectType,
   mSet: TypeRepresentationType = TypeRepresentationType.instance())
{
  type ResultType = TypeRepresentationInstance;
  const { emptyTuple } = TupleObjectType;
  const mVisitor: AstVisitor<TypeRepresentationInstance> = freeze({
    visitLiteral(_0: Token, type: AstLiteralType): ResultType {
      if (type === 'number') {
        return mSet.instanceFor(IntegerType.instance());
      }

      return mSet.instanceFor(ConstantStringType.instance());
    },
    visitTuple(nodes: Readonly<AstNode[]>): ResultType {
      const reps = nodes.map(n => n.visit(mVisitor));
      const errIdx = reps.findIndex((rep: TypeRepresentationInstance) => !rep.resultantType());
      if (errIdx !== -1)
        { return reps[errIdx]; }

      const types = reps.map(n => n.resultantType() as ObjectType);
      return mSet.instanceFor(TupleObjectType.instanceFor(types));
    },
    visitFringe(token: Token): ResultType {
      const oriCallName = token.content();
      const callName = oriCallName === FunctionNamingSchema.kContextName ?
        oriCallName :
        FunctionNamingSchema.mapToFringeAccessor(oriCallName);
      const fringeType = mContextType.lookUp(callName)?.
        byParameters(emptyTuple())?.
        returns();
      if (!fringeType) {
        return TypeRepresentationType.makeErrorRepresentation(`Cannot find function named "${callName}"`);
      }

      return mSet.instanceFor(fringeType);
    },
    visitCall(callName: Token, receiver: AstNode, args: AstNode): ResultType {
      const recRep = receiver.visit(mVisitor);
      const recType = recRep.resultantType();
      if (!recType) { 
        return recRep;
      }
      const argRep = args.visit(mVisitor);
      const argType = argRep.resultantType();
      if (!argType) {
        return argRep;
      }
      return mSet.instanceFor(recType).lookUp(callName.content(), argType);
    },
    visitInitializer(
      _0: Readonly<Token[]>,
      _1: AstInitializerType,
      _2: AstNode): ResultType
    {
      // TODO we need a central place to define that they return nothing
      return mSet.instanceFor(emptyTuple());
    },
    visitFunctionDefinition(_0: number, _1: Readonly<AstNode[]>): ResultType {
      return mSet.instanceFor( FunctionIndexType.of(mContextType).functionIndexType() );
    }
  });

  function representationFor(node: AstNode): TypeRepresentationInstance {
    return node.visit(mVisitor);
  }

  return freeze({ representationFor })
}

export const NodeTypeInference = freeze({ make });
