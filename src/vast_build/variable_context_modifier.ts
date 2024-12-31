import {
  CallHandlingStrategies,
  CallingContext,
  IncompleteFunctionType,
  type BuiltInFunction
} from '../function_type';
import { Helpers, StandardError } from '../helpers';
import { type CodeWriter } from '../code_writer';
import { ObjectLookUpTable } from '../object_look_up_table';
import { ObjectType } from '../object_type';
import { VariableDeclaration } from '../variable_declaration';
import { AstFunctionDefinitionNode } from './ast_function_definition_node';
import { type LetNameElement } from './let_names_collection';
import { type WritableObjectType } from '../writable_object_type';

const { freeze, memoize, presenceAsserted } = Helpers;

function construct
  (mElement: LetNameElement,
   mWritableContextType: WritableObjectType,
   mObjectTable: ObjectLookUpTable)
{
  const { emptyTupleInstance } = ObjectType;
  const { setErrorFn, error } = StandardError.make();
  const executionTypeRes = memoize(() =>
    mElement.node.executionType(mObjectTable));
  const executionType = memoize(() =>
    executionTypeRes().resolve() ?? setErrorFn(executionTypeRes().error));
  const assertedExecutionType = presenceAsserted(executionType);
  const variable = () => VariableDeclaration.
    make(mElement.name, assertedExecutionType(), mElement.operator);
  const anyAreDefs =
    memoize(() => mElement.node.map<boolean>(AstFunctionDefinitionNode.hasCreated));
  const isFunctionDefinition = () =>
    anyAreDefs().length === 1 &&
    anyAreDefs().reduce((prev: boolean, cur: boolean) => prev && cur);
  const variableGetter = presenceAsserted(() =>
    mWritableContextType.
      objectType().
      lookUp(`.${mElement.name}`)?.
      byParameters(emptyTupleInstance()));

  const asFunctionDefinition = () => {
    const getter = variableGetter();
    return IncompleteFunctionType.
      make().
      setCallStrategy(CallHandlingStrategies.noReceiver).
      setName(mElement.name).
      setParameters(emptyTupleInstance()).
      setReturns(emptyTupleInstance()).
      setBuiltin((_0: CallingContext, codeWriter: CodeWriter) => {
        getter.onBuiltIn((bif: BuiltInFunction) => {
          bif(CallingContext.canTakeAll(), codeWriter);
        });
        // do an indirect call to the loaded index
        codeWriter.indirectCall( 0 );
      }).
      finish();
  };

  function modifiedContextType() {
    if (!executionType())
      { return undefined; }
    variable().mergeInto(mWritableContextType);
    if (isFunctionDefinition()) {
      mWritableContextType.
        pushFunctionTypeByName(mElement.name, asFunctionDefinition());
    }
    return mWritableContextType;
  }

  return freeze({
    modifiedContextType: memoize(modifiedContextType),
    error
  });
}

export const VariableContextModifier = freeze({ make: construct });
export type  VariableContextModifier = ReturnType<typeof construct>;
