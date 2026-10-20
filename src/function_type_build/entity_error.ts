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
import { NodeError } from '../melody_components';

const { freeze, memoize } = Helpers;

export interface EntityError {
  setErrorMessage(message: string): undefined;
  error(): NodeError | undefined;
};

export const EntityError = freeze({
  make(): EntityError {
    let mMessage: string | undefined;
    const mComponent: NodeError = freeze({
      uid: memoize(Symbol),
      type: () => 'error',
      error: memoize(() => {
        if (mMessage === undefined)
          { raise('no error set!'); }

        return freeze({ message: mMessage });
      })
    });

    const setErrorMessage = (message: string): undefined => {
      mMessage = message;
      return undefined;
    };

    const error = (): NodeError | undefined => {
      if (mMessage === undefined)
        { return undefined; }

      return mComponent;
    };

    return freeze({ setErrorMessage, error });
  }   
});
