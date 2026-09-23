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

import { Helpers, raise, StandardError, StandardErrorMessage } from '../../helpers';
import { AstNode } from '../../ast_node';
import { OperatorNamingSchema } from '../../operator_naming_schema';
import { Token } from '../../token';
import { NodeConstructorCollection } from './node_constructor_collection';
import { NodeConstructor, OperatorConstructor } from './operator_constructor';
import { OperatorDefinition, OperatorDefinitions } from '../operator_definitions';

const { freeze, memoize } = Helpers;

export interface OperatorConstructorBuild {
  operatorConstructor(): OperatorConstructor | undefined;
  error(): StandardErrorMessage;
};

const isOperator = () => true;
const isNotOperator = () => false;
const asNoToken = (): Token | undefined => undefined;
const {
  tuplify,
  makeCall,
  emptyTupleInstance
} = AstNode.forAstExpressionBuild;
function makeNodeMakerFor(node: AstNode) {
  return (_0: NodeConstructorCollection): AstNode => node;
}

const kSecret = Symbol();

type OperatorPrecedence = { precedence: number; position: number; };

type BinaryConstructor = (rec: AstNode, params: AstNode) => AstNode;

type UnaryConstructor = (rec: AstNode) => AstNode;

type NodeArrayModifier = (ctors: NodeConstructorCollection) => AstNode;

function asOpC(op: OperatorConstructor): OperatorPrecedence | undefined {
  return (op as unknown as { [kSecret]: OperatorPrecedence | undefined })[kSecret];
}

function binaryNodeConstructorFor
  (callName: Token): BinaryConstructor
{
  const op = callName.content();
  if (op === OperatorNamingSchema.kComma) {
    return (lhs: AstNode, rhs: AstNode) => tuplify(lhs, rhs);
  }

  if (op === OperatorNamingSchema.kCall) {
    return (rec: AstNode, params: AstNode) => makeCall(callName, rec, params);
  }

  return (rec: AstNode, params: AstNode) =>
    makeCall(callName, rec, params);
}

function unaryNodeConstructorFor
  (op: Token): UnaryConstructor
{ return (rec: AstNode) => makeCall(op, rec, emptyTupleInstance()); }

function makeCompareFunc(info: OperatorPrecedence): (other: OperatorConstructor) => number {
  return (other: OperatorConstructor) => {
    const otherInfo = asOpC(other) ?? raise('not a valid operator instance');
    const diff = info!.precedence - otherInfo.precedence;
    if (diff === 0)
      { return info.position - otherInfo.position; }

    return diff;    
  };
}

function makeArrayModifierForBinary
  (nodeConstructor: BinaryConstructor, position: number): NodeArrayModifier 
{
  return (ctors: NodeConstructorCollection): AstNode => {
    const recCtor = ctors.at(position - 1);
    const paramsCtor = ctors.at(position + 1);
    const rec = recCtor.makeNode(ctors);
    const params = paramsCtor.makeNode(ctors);
    const node = nodeConstructor(rec, params);
    const opc: NodeConstructor = freeze({
      isOperator: isNotOperator,
      asToken: asNoToken,
      makeNode: makeNodeMakerFor(node),
      lowPosition: recCtor.lowPosition,
      highPosition: paramsCtor.highPosition
    });
    ctors.replace(opc);
    return node;
  };
}

function makeArrayModifierForUnary
  (nodeConstructor: UnaryConstructor, position: number): NodeArrayModifier 
{
  return (ctors: NodeConstructorCollection): AstNode => {
    const recCtor = ctors.at(position + 1);
    const rec = recCtor.makeNode(ctors);
    const node = nodeConstructor(rec);
    const opc: NodeConstructor = freeze({
      isOperator: isNotOperator,
      asToken: asNoToken,
      makeNode: makeNodeMakerFor(node),
      lowPosition: () => position,
      highPosition: recCtor.highPosition,
    });
    ctors.replace(opc);
    return node;
  };
}

function make(mOpToken: Token, mIsUnaryContext: boolean, mPosition: number): OperatorConstructorBuild {
  OperatorDefinitions.assertIsOperator(mOpToken.content());
  const { error, setErrorMessage } = StandardError.make();

  const position = () => mPosition;

  const operatorDefinition = memoize((): OperatorDefinition | undefined => {
    const getOperatorInfo = mIsUnaryContext ?
      OperatorDefinitions.unaryMappings :
      OperatorDefinitions.binaryMappings;
    const info = getOperatorInfo()[mOpToken.content()];
    if (!info) {
      const context = mIsUnaryContext ? 'unary' : 'binary';
      return setErrorMessage(
        `"${mOpToken.content()}" is not a valid operator (at least for ` +
        `the ${context} context)`);
    }

    return info;
  });

  const operatorPrecedence = memoize((): OperatorPrecedence | undefined => {
    const info = operatorDefinition();
    if (!info)
      { return undefined; }

    const position = mPosition*( info.isPositionReversed ? -1 : 1 );
    return freeze({
      precedence: info.precedence,
      position
    });
  });

  const makeNodeFunc = ((): NodeArrayModifier | undefined => {
    if (!operatorDefinition()) 
      { raise('bad branch'); }

    if (operatorDefinition()!.relation === 'binary') {
      const ctor = binaryNodeConstructorFor(mOpToken);
      return makeArrayModifierForBinary(ctor, mPosition);
    }

    const ctor = unaryNodeConstructorFor(mOpToken);
    return makeArrayModifierForUnary(ctor, mPosition);
  });

  const operatorConstructor = memoize((): OperatorConstructor | undefined => {
    if (!operatorPrecedence())
      { return undefined; }

    return freeze({
      [kSecret]: operatorPrecedence()!,
      isOperator,
      compare: makeCompareFunc(operatorPrecedence()!),
      makeNode: makeNodeFunc()!,
      asToken: () => mOpToken,
      lowPosition: position,
      highPosition: position
    });
  });
  
  return freeze({ operatorConstructor, error });
}

export const OperatorConstructorBuild = freeze({ make });
