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

import * as cbs from './context_build/context_base_stage';
import * as cls from './context_build/context_link_stage';
import * as cdb from './context_build/context_declaration_build';
import * as rr from './context_build/receiver_resolution';

export type  ContextBaseStage = cbs.ContextBaseStage_;
export const ContextBaseStage = cbs.ContextBaseStage_;

export type  ContextLinkStage = cls.ContextLinkStage_;

export type ContextDeclarationBuild = cdb.ContextDeclarationBuild_;

export type ContextTypeProgression = cdb.ContextTypeProgression_;

export type ReceiverResolution = rr.ReceiverResolution_;
