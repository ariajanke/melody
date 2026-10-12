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

import { FunctionNamingSchema } from '../../function_naming_schema';
import { Helpers, raise } from '../../helpers';
import { ObjectType } from '../../melody_components';
import { AncestorCollection, AncestorInfo } from './ancestor_collection';

const { freeze, memoize } = Helpers;
type ThingMap = {
  readonly variableName?: string;
};
interface PendingVariables {
  initializersAndVariableNames(): Readonly<[string, string[]][]>;
  functionToVariableNames(): Readonly<{ [fname: string]: string | undefined }>;
};

interface WritablePendingVariables {
  appendInitializer
    (mInitializerType: ObjectType,
     mVariableNames: Readonly<string[]>,
     mVariableTypes: Readonly<ObjectType[]>): void;
};

function append
(mInitializerType: ObjectType,
       mVariableNames: Readonly<string[]>,
       mVariableTypes: Readonly<ObjectType[]>)

{

  FunctionNamingSchema.mapToInitialSetName(mVariableNames);
}
