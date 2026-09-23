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

import { FunctionDefinitionRegistry } from './function_definition_registry';
import { FunctionTypeBuild } from './function_type_build';
import { Helpers, StandardErrorMessage } from './helpers';
import { AstBuild } from './ast_build';
import { Tokenization } from './tokenization';
import { WasmCompilation, WasmImports } from './wasm_compilation';

const { freeze, memoize } = Helpers;

export interface Compiler {
  byteCode(): Uint8Array | undefined;
  importsObject(): WasmImports | undefined;
  error(): string | undefined;
};

function make(mSource: string,
              mInjections = WasmCompilation.defaultInjections())
  : Compiler
{
  let mError: string | undefined = undefined;

  const astBuild = memoize(() => {
    const tokenization = Tokenization.make(mSource);
    
    return AstBuild.make(tokenization.tokens());
  });

  const functionRegistry = memoize(() => {
    if (!astBuild()) {
      return undefined;
    }
    const rootNode = astBuild()!.node();
    if (!rootNode) {
      mError = astBuild()!.errors().map((v: StandardErrorMessage) => v.message).join(', ');
      return undefined;
    }

    const functionRegistry_ = FunctionDefinitionRegistry.make();
    const ftypeBuild = FunctionTypeBuild.make(rootNode, functionRegistry_);
    if (!ftypeBuild.functionType()) {
      mError = ftypeBuild.error().message;
      return undefined;
    }

    return functionRegistry_;
  });

  const compile = memoize(() => {
    if (!functionRegistry())
      { return undefined; }

    return WasmCompilation.make(functionRegistry()!, mInjections);
  });

  const byteCode = (): Uint8Array | undefined => compile()?.byteCode();
  const importsObject = (): WasmImports | undefined => compile()?.importObject();

  return freeze({
    byteCode,
    importsObject,
    error() { return mError; }
  });
}

export const Compiler = freeze({
  make,
  defaultInjections: WasmCompilation.defaultInjections
});

Helpers.expose({ Compiler });
