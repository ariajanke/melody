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
  AstInitializerExpression,
  AstInitializerQualifier,
  AstLiteralType,
  AstNode,
  AstParameterExpression,
  AstVisitor
} from '../ast_node';
import { Helpers, StandardErrorMessage, raise } from '../helpers';
import { OperatorNamingSchema } from '../operator_naming_schema';
import { Token } from '../token';
import { OperatorDefinitions } from './operator_definitions';

const { freeze, memoize } = Helpers;

interface WritableNameExpressionValue {
  qualifier: AstInitializerQualifier;
  node : AstNode;
};

interface WritableNameExpression {
  names: Readonly<Token[]>;
  typeNode?: AstNode;
  value?: WritableNameExpressionValue;
};

type ResultType = WritableNameExpression | StandardErrorMessage;

const checkPrecedenceAssumption = memoize((): void => {
  const { kIs, kAssignment, kEquality } = OperatorNamingSchema;
  const { binaryMappings } = OperatorDefinitions;
  const isPrec = binaryMappings()[kIs]?.precedence;
  const eqPrec = binaryMappings()[kEquality]?.precedence;
  const assgnPrec = binaryMappings()[kAssignment]?.precedence;
  if (isPrec === undefined || eqPrec === undefined || assgnPrec === undefined)
    { raise('operators undefined'); }

  if (isPrec <= eqPrec || isPrec <= assgnPrec) {
    raise('failed assumption: "is" must be stronger binding than "=" or ":="');
  }
});

const visitToStripType = memoize((): AstVisitor<ResultType> => freeze({
  ...visitToStripNames(),
  visitCall(callName: Token, rec: AstNode, args: AstNode): ResultType {
    const cn = callName.content();
    if (cn !== OperatorNamingSchema.kIs) {
      return ({ message: `cannot use "${cn}" within a name expression` });
    }

    const typeNode = args;
    const gv = rec.visit(visitToStripType());
    if ('names' in gv) {
      if (gv.typeNode) {
        return ({ message: 'already has an "is" operator' });
      }
      gv.typeNode = typeNode;
      return gv;
    }

    return gv;  
  }
}));

const visitToStripValue = memoize((): AstVisitor<ResultType> => freeze({
  ...visitToStripNames(),
  visitCall(callName: Token, rec: AstNode, args: AstNode): ResultType {
    const cn = callName.content();
    if (cn !== OperatorNamingSchema.kAssignment &&
        cn !== OperatorNamingSchema.kEquality)
    {
      return ({ message: `cannot use "${cn}" within a name expression` });
    }

    const node = args;
    const gv = rec.visit(visitToStripType());
    if ('names' in gv) {
      if (gv.value)
        { raise('bad branch: duplicate values'); }

      gv.value = {
        node,
        qualifier: cn
      };
      return gv;
    }

    return gv;
  }
}));

const visitToStripNames = memoize((): AstVisitor<ResultType> => {
  const visitToInvalidNames = memoize((): AstVisitor<StandardErrorMessage> => freeze({
    visitLiteral: (_0: Token, _1: AstLiteralType): StandardErrorMessage =>
      ({ message: 'cannot use literal as a name' }),
    visitFringe: (_0: Token): StandardErrorMessage =>
      { raise('bad branch'); },
    visitTuple: (_0: Readonly<AstNode[]>): StandardErrorMessage =>
      ({ message: 'invalid nested tuple as part of a name' }),
    visitInitializer: (_0: AstInitializerExpression): StandardErrorMessage =>
      { raise('an initializer should not appear here'); },
    visitCall: (_0: Token, _1: AstNode, _2: AstNode): StandardErrorMessage =>
      ({ message: 'calls are not valid for names' }),
    visitFunctionDefinition: (_0: number, _1: Readonly<AstParameterExpression[]>,_2: Readonly<AstNode[]>): StandardErrorMessage =>
      ({ message: 'function defs are not allowed here' })
  }));

  const nextLevel = memoize((): AstVisitor<Token | StandardErrorMessage> => freeze({
    ...visitToInvalidNames(),
    visitFringe: (token: Token): Token => token
  }));

  const isErrorMessage = (value: Token | StandardErrorMessage) => 'message' in value;

  const recurseForTuple = (node: AstNode): Token | StandardErrorMessage =>
    node.visit(nextLevel());

  const toContent = (t: Token) => t.content();

  function duplicateNamesFound
    (tokens: Readonly<Token[]>): StandardErrorMessage | undefined
  {
    const sortedNames = tokens.map(toContent).sort();
    const sLen = sortedNames.length;
    for (let i = 0; i < sLen - 1; ++i) {
      if (sortedNames[i] === sortedNames[i - 1]) {
        return freeze({
          message: `duplicate name "${sortedNames[i]}" not allowed`
        });
      }
    }

    return undefined;
  }
  
  return freeze({
    ...visitToInvalidNames(),
    visitFringe: (token: Token): WritableNameExpression =>
      ({ names: [token] }),
    visitTuple(nodes: Readonly<AstNode[]>): ResultType {
      const gv = nodes.map(recurseForTuple);
      const fIdx = gv.findIndex(isErrorMessage);
      if (fIdx !== -1)
        { return gv[fIdx] as StandardErrorMessage; }

      const asTokens = gv as Token[];
      return duplicateNamesFound(asTokens) ?? ({ names: asTokens });
    },
  });
});

export type NameExpression = Readonly<WritableNameExpression>;

export interface NameExpressionBuild {
  nameExpression(): NameExpression | undefined;
  error(): StandardErrorMessage;
};

export type NameExpressionOptions = 'allow-value' | 'no-value';

function make
  (mNode: AstNode,
   mValueIsAllowed: NameExpressionOptions,
   mRecurseOn: (n: AstNode) => AstNode | undefined): NameExpressionBuild
{
  checkPrecedenceAssumption();
  let mError: StandardErrorMessage | undefined = undefined;
  const mVisitor = mValueIsAllowed === 'allow-value' ?
    visitToStripValue() : visitToStripType();

  const error = (): StandardErrorMessage =>
    mError ?? raise('no error set');

  const nameExpression = memoize((): NameExpression | undefined => {
    const gv = mNode.visit(mVisitor);
    if ('message' in gv) {
      mError = gv;
      return undefined;
    }

    if (gv.names.length === 0) {
      mError = freeze({ message: 'there must be at least one name' });
      return undefined;
    }

    if (gv.value) {
      const valueNode = mRecurseOn(gv.value.node);
      if (!valueNode)
        { return undefined; }

      gv.value.node = valueNode;
    }
    if (gv.typeNode) {
      const typeNode = mRecurseOn(gv.typeNode);
      if (!typeNode)
        { return undefined; }

      gv.typeNode = typeNode;
    }
    return gv;
  });

  return freeze({ nameExpression, error });
}

export const NameExpressionBuild = freeze({ make });
