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

import { BuiltinFunctionNames } from '../../../src/builtin_function_names';
import { FunctionNamingSchema } from '../../../src/function_naming_schema';
import { ContextBaseStage } from '../../../src/function_type_build/context_build';
import { TupleObjectType } from '../../../src/function_type_build/tuple_object_type';
import { TestHelpers } from '../../test_helpers';

const { describeNamed } = TestHelpers;

describeNamed({ ContextBaseStage }, () => {
  const inst = ContextBaseStage.make();
  const lookUp = inst.referenceType().lookUp;
  const { emptyTuple } = TupleObjectType;

  it('defines builtin function for "SystemIO"', () => {
    expect(lookUp(BuiltinFunctionNames.kSystemIoTable)).toBeDefined();
  });

  it('defines self referential function <context>', () => {
    expect(lookUp(FunctionNamingSchema.kContextName)).toBeDefined();
  });

  it('self referential function is defined correctly', () => {
    const ftype = lookUp(FunctionNamingSchema.kContextName)?.
      byParameters(emptyTuple());
    expect(ftype?.receiver().uid()).toEqual(emptyTuple().uid());
    expect(ftype?.returns().uid()).toEqual(inst.referenceType().uid());
  });
});
