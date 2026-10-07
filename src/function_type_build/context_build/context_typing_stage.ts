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

import { BuiltinFunctionNames } from '../../builtin_function_names';
import { CodeWriter } from '../../code_writer';
import { FunctionNamingSchema } from '../../function_naming_schema';
import { Helpers, raise, StandardError } from '../../helpers';
import { ContextFrameStack } from '../context_frame_stack';
import { FunctionTypeBase } from '../function_type_base';
import { MutableFunctionTable } from '../mutable_function_table';
import { ContextLinkStage_ } from './context_link_stage';
import { BuiltinTypeBase } from '../builtin_type_base';
import { FunctionOpLookUp, WritableObjectType } from './writable_object_type';
import { WasmCompilation } from '../../wasm_compilation';
import { SystemIoType } from '../system_io_type';
import { PutsFunctionLookUpTable } from '../puts_function_look_up_table';
import { FunctionLookUpTable, FunctionType, MelodyComponentVisitor, ObjectType } from '../../melody_components';
import { TupleObjectType } from '../tuple_object_type';
import { AstInitializerNode } from '../../ast_node';
import { NodeTypeInference } from '../node_type_inference';
import { NodeTypeEvaluation } from '../node_type_evaluation';
import { InitializerVariable, OrderedInitialSetsCollection } from './ordered_initial_sets_collection';
import { AttributesCreation } from './attributes_creation';

const { freeze, memoize } = Helpers;

function make
  (mWritableReferenceType: WritableObjectType,
   mDeclarations: Readonly<AstInitializerNode[]>)
{
  const { error, setErrorFn, setErrorMessage } = StandardError.make();
  const mNodeTypeInference = NodeTypeInference.make();
  function typeFrom
    (inprogressContextType: WritableObjectType,
     decl: InitializerVariable): ObjectType | undefined
  {
    if (decl.typeNode) {
      const { objectType, error } = NodeTypeEvaluation.make(decl.valueNode);
      return objectType() ?? setErrorFn(error);
    }

    const trt = mNodeTypeInference.
      useFor(inprogressContextType).
      representationFor(decl.valueNode);
    return trt.resultantType() ?? setErrorFn(trt.error);    
  }

  const mOrderedInitializers =
    OrderedInitialSetsCollection.make(mDeclarations);

  function reducer
    (inprogressContextType: WritableObjectType | undefined,
     initializer: InitializerVariable): WritableObjectType | undefined
  {
    if (!inprogressContextType)
      { return undefined; }

    const type = typeFrom(inprogressContextType, initializer);
    if (!type)
      { return undefined; }
    
    initializer.variableNames.reduce((inprogressContextType: WritableObjectType, vname: string, idx: number): WritableObjectType => {
      const fnames = mOrderedInitializers.variableNameMap();
      AttributesCreation.make(inprogressContextType, vname, fnames, )
    }, inprogressContextType);

    ;
    // turn that type and decl node into ftypes on the context type
    // without byte code emissions!
    return inprogressContextType;
  }

  const writableReferenceType = memoize((): WritableObjectType | undefined =>
    mOrderedInitializers.
    orderedInitialSets().
    reduce(reducer, mWritableReferenceType));
}