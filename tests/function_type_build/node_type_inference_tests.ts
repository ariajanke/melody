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

import { AstNode } from '../../src/ast_node';
import { FunctionNamingSchema } from '../../src/function_naming_schema';
import { FunctionLookUpTable, FunctionType, ObjectType } from '../../src/function_type_build';
import { BuiltinTypeBase, ConstantStringType } from '../../src/function_type_build/builtin_type_base';
import { FunctionTypeBase } from '../../src/function_type_build/function_type_base';
import { IntegerType } from '../../src/function_type_build/integer_type';
import { MutableFunctionTable } from '../../src/function_type_build/mutable_function_table';
import { NodeTypeInference } from '../../src/function_type_build/node_type_inference';
import { TypeRepresentationInstance } from '../../src/function_type_build/type_representation_type';
import { Helpers } from '../../src/helpers';
import { AstFactories } from '../ast_factories';
import { TestHelpers } from '../test_helpers';

const { memoize, freeze } = Helpers;

const { describeNamed } = TestHelpers;

describeNamed({ NodeTypeInference }, () => {
  // need a context type and representative nodes
  const { makeFringe, makeCall } = AstFactories;
  const { kContextName } = FunctionNamingSchema;
  const returnsIntFtype = memoize((): FunctionType => freeze({
    ...FunctionTypeBase.makeNewEmitlessEmpty(),
    returns: IntegerType.instance
  }));
  const returnsStringFtype = memoize((): FunctionType => freeze({
    ...FunctionTypeBase.makeNewEmitlessEmpty(),
    returns: ConstantStringType.instance
  }));
  const stuffType = memoize(() => freeze({
    ...BuiltinTypeBase.makeNewWithDefaults(),
    name: () => 'StuffType'
  }));
  const getStuffFtype = memoize((): FunctionType => freeze({
    ...FunctionTypeBase.makeNewEmitlessEmpty(),
    parameters: ConstantStringType.instance,
    returns: stuffType
  }));
  const selfGetter = ((): FunctionType => freeze({
    ...FunctionTypeBase.makeNewEmitlessEmpty(),
    returns: (): ObjectType => sampleContext()
  }));
  const { fromFunctionType } = MutableFunctionTable;
  const sampleContextLookUpTable = memoize((): Readonly<{ [name: string]: FunctionLookUpTable | undefined }> => freeze({
    '.a': fromFunctionType(returnsIntFtype()),
    '.b': fromFunctionType(returnsIntFtype()),
    'getStuff': fromFunctionType(getStuffFtype()),
    '.s': fromFunctionType(returnsStringFtype()),
    [kContextName]: fromFunctionType(selfGetter())
  }));
  function sampleContextLookUp
    (operation: string | symbol): FunctionLookUpTable | undefined
  {
    if (typeof operation === 'symbol')
      { return undefined; }

    return sampleContextLookUpTable()[operation];
  }
  const sampleContext = memoize((): ObjectType => freeze({
    ...BuiltinTypeBase.makeNewWithDefaults(),
    lookUp: sampleContextLookUp
  }));

  const aNode = memoize(() => makeFringe('a'));
  const fiveNode = memoize(() => makeFringe('5'));
  const inst = memoize(() => NodeTypeInference.make().useFor(sampleContext()));
  const makeInference = (node: () => AstNode) =>
    memoize(() => inst().representationFor( node() ));

  function makesInferenceOf(trt: () => TypeRepresentationInstance, exType: ObjectType) {
    it('infers a type', () => {
      expect(trt().resultantType()).toBeDefined();
    });

    it(`infers the type is a(n) ${exType.name()}`, () => {
      expect(trt().resultantType()?.uid()).toEqual(exType.uid());
    });
  }

  function inferenceFails(trt: () => TypeRepresentationInstance, exError: string) {
    it('does not infer a type', () => {
      expect(trt().resultantType()).toBeUndefined();
    });

    it(`has '${exError}' error`, () => {
      trt().resultantType();
      expect(trt().error().message).toEqual(exError);
    });
  }

  describe('expression: "a", defined as an Integer', () => {
    const inference = makeInference(aNode);

    makesInferenceOf(inference, IntegerType.instance());
  });

  describe('expression: "5 + a", defined as an Integer', () => {
    const inference = makeInference(() => makeCall('+', fiveNode(), aNode()));

    makesInferenceOf(inference, IntegerType.instance());
  });

  describe('expression: "a - b", both defined as Integers', () => {
    const inference = makeInference(() => makeCall('-', aNode(), 'b'));

    makesInferenceOf(inference, IntegerType.instance());
  });

  describe(`expression: "getStuff('beans')", which returns a "StuffType" type`, () => {
    const inference = makeInference(() =>
      makeCall('getStuff', kContextName, `'beans'`));

    makesInferenceOf(inference, stuffType());
  });

  describe('expression: "c", where "c" is not defined"', () => {
    const inference = makeInference(() => makeFringe('c'));

    inferenceFails(inference, 'Cannot find function named ".c"');
  });

  describe('expression: "s + 5", defined as a ConstString', () => {
    const inference = makeInference(() => makeCall('+', 's', fiveNode()));

    inferenceFails(inference, '+ is not defined for ConstantString type');
  });
});
