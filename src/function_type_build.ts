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

import { CodeWriter } from './code_writer';
import { FunctionDefinitionRegistry } from './function_definition_registry';
import { FunctionTypeBase } from './function_type_build/function_type_base';
import { FunctionTypeBuildVisitor } from './function_type_build/function_type_build_visitor';
import { TupleObjectType } from './function_type_build/tuple_object_type';
import { Helpers, raise, StandardErrorMessage } from './helpers';
import { AstNode } from './ast_node';

const { freeze, memoize } = Helpers;

// export interface FunctionType extends MelodyRecord {
//   parameters(): ObjectType;
//   returns(): ObjectType;
//   receiver(): ObjectType;

//   // optionally one of:
//   // - immediate function
//   // - immediate value (for empty tuple ftypes)
//   // - embeddable
//   // - registerable
//   // - code emission

//   // simpleEmit(writer: CodeWriter): void;

//   // emit(receiverFtype: FunctionType,
//   //      parameterFtype: FunctionType,
//   //      writer: CodeWriter): void;

//   // uid(): symbol;
// };

// export interface EmissionContext {
//   pushParameters(obj: ObjectType, em: CodeEmission): void;
//   pushReceiver(obj: ObjectType, em: CodeEmission): void;
//   popParameters(obj: ObjectType): CodeEmission;
//   popReceiver(obj: ObjectType): CodeEmission;
// };

export const EmissionContext = freeze({
  make() {
    type ObjectEmissionPair = {
      objectType: ObjectType;
      emission: CodeEmission;
    };
    const { emptyTuple } = TupleObjectType;
    const isEmptyTuple = (obj: ObjectType) =>
      obj.uid() === emptyTuple().uid();
    const makeEmptyPair = (): ObjectEmissionPair => ({
      objectType: emptyTuple(),
      emission: ({ emit(_0: CodeWriter, _1: EmissionContext) { } })
    });
    const kEmptyPair = makeEmptyPair();
    const mReceiver: ObjectEmissionPair = makeEmptyPair();
    const mParameters: ObjectEmissionPair = makeEmptyPair();
    const makePush =
      (name: string, pair: ObjectEmissionPair): EmissionContext['pushParameters'] =>
        (obj: ObjectType, em: CodeEmission): void => {
          if (!isEmptyTuple(mParameters.objectType)) {
            raise(`Unconsumed ${name}`);
          }
          pair.objectType = obj;
          pair.emission = em;
        };
    const makePop =
      (name: string, pair: ObjectEmissionPair): EmissionContext['popParameters'] =>
        (obj: ObjectType): CodeEmission => {
          if (obj.uid() === pair.objectType.uid()) {
            const rv = pair.emission;
            pair.emission = kEmptyPair.emission;
            pair.objectType = kEmptyPair.objectType;
            return rv;
          }

          raise(`Cannot pop, expected different type (${pair.objectType.name()}) for ${name}`);
        };

    return freeze({
      pushParameters: makePush('parameters', mParameters),
      pushReceiver: makePush('receiver', mReceiver),
      popParameters: makePop('parameters', mParameters),
      popReceiver: makePop('receiver', mReceiver)
    });
  }
});

export interface CodeEmission extends MelodyRecord {
  emit(writer: CodeWriter, ctx: EmissionContext): void;
};

export const FunctionType = FunctionTypeBase;

// export interface ObjectType extends MelodyRecord {
//   /// Display name only, no semantic use.
//   name(): string;

//   lookUp(operation: string | symbol): FunctionLookUpTable | undefined;

//   /// If this is a tuple, it maybe "detuplified". By definition there are no
//   /// single member tuples.
//   detuplify(): Readonly<ObjectType[]> | undefined;
//   // uid(): symbol;

//   sizeInBytes(): number;
//   sizeInStackItems(): number;
// };

export interface MutableObjectType extends ObjectType {
  setLookUp(operation: string | symbol, lookUpTable: FunctionLookUpTable): void;
};

// export interface FunctionLookUpTable {
//   byParameters(type: ObjectType): FunctionType | undefined;
//   uniqueFunctionType(): FunctionType | undefined;
// };

export interface FunctionTypeBuild {
  functionType(): FunctionType | undefined,
  error(): StandardErrorMessage
};

// export interface ImmediateValue extends MelodyRecord {
//   asInteger(): number | undefined;
//   asObjectType(): ObjectType | undefined;
// };

// interface MelodyRecord {
//   // differentiate records this way
//   visit<T>(visitor: MelodyRecordVisitor<T>): T;
//   uid(): symbol;
// };

// interface MelodyRecordVisitor<T> {
//   visitFunctionType(ftype: FunctionType): T;
//   visitCodeEmission(cem: CodeEmission): T;
//   visitObjectType(otype: ObjectType): T;
// };

// interface RecordsRetrieval {
//   emission(): CodeEmission | undefined;
//   objectType(): ObjectType;
//   immediateValue(): ImmediateValue | undefined;
// };

// interface RecordsRetrievalBuild {
//   records(): RecordsRetrieval | undefined;
//   error(): StandardErrorMessage;
// };

// interface BigCannoliDatabase {
//   retrieveForNode(node: AstNode): RecordsRetrieval;
// };

// interface WritableDatabase extends BigCannoliDatabase {
//   // differentiate the type, record to the correct "table",
//   // and raise if the wrong type is passed
//   writeForNode(node: AstNode, record: MelodyRecord): void;
// }

// interface ImmediateFunction {
//   call(receiver: ImmediateValue, parameters: ImmediateValue): ImmediateValue;
// };

// interface FunctionRegistry {
//   register(ftype: FunctionType, completedContextType: ObjectType): void;
// };

function make(mRoot: AstNode,
              mFunctionRegistry?: FunctionDefinitionRegistry)
  : FunctionTypeBuild
{
  mFunctionRegistry ??= FunctionDefinitionRegistry.make();
  const mVisitor = FunctionTypeBuildVisitor.make(mFunctionRegistry);
  const mBuild = memoize(() => mRoot.visit(mVisitor));

  return freeze({
    functionType: () => mBuild().functionType(),
    error: () => mBuild().error()
  });
}

// TODO, remove me, we're not doing amalgam building anymore
export const FunctionTypeBuild = freeze({
  make,
  emptyTupleType: TupleObjectType.emptyTuple
});
