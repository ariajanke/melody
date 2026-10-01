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

import { Helpers } from '../../src/helpers';
import { TestHelpers } from '../test_helpers';
import { NameExpressionBuild } from '../../src/ast_build/name_expression_build';

const { freeze, memoize } = Helpers;

const { describeNamed } = TestHelpers;

describeNamed({ NameExpressionBuild }, () => {
  it('has tests', fail);
});
