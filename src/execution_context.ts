import { Helpers } from './helpers';
// import { ContextVariable } from './context_variable';
import { ObjectLookUpTable } from './object_look_up_table';
import { ObjectType } from './object_type';
import { CallHandlingStrategies, IncompleteFunctionType } from './function_type';
import { ObjectTypeResolution } from './object_type_resolution';
import { type AstNode } from './ast_node';
import { FunctionLookUpTable } from './function_look_up_table';
import { type LetNameElement } from './let_names_collection';
import { AstFunctionDefinitionNode } from './ast_function_definition_node';
import { VariableDeclarationFunctionTable } from './variable_declaration_function_table';
import { MemoryArray } from './memory_array';
// import { ContextType } from './context_type';

const { freeze } = Helpers;
const { noReceiver } = CallHandlingStrategies;

export interface ExecutionContext {
  declareVariable: (element: LetNameElement) => ObjectType
  executionTypeOf: (node: AstNode) => ObjectTypeResolution
  functionLookUpFor: (name: string) => FunctionLookUpTable | undefined
  lookUpOnContextType: (operation: string) => FunctionLookUpTable
  onContextTypeFor:
    <Type>(objType: ObjectType | undefined, fn: () => Type) => Type | undefined
}

export const ExecutionContext = (() => {

  function make(mContextType: ObjectType): ExecutionContext {
    const counter = (() => {
      let i = 1 + MemoryArray.stackPointerLocation();
      return () => i++;
    })();

    function declareVariable(element: LetNameElement): ObjectType {
      const { name, type } = element;
      const asDefs: (AstFunctionDefinitionNode | undefined)[] =
        element.node.map<AstFunctionDefinitionNode | undefined>((node: AstNode) => {
          if (AstFunctionDefinitionNode.hasCreated( node )) {
            return node as AstFunctionDefinitionNode;
          }
          return undefined;
        }) as (AstFunctionDefinitionNode | undefined)[];
      if (type.name() === 'Function' && asDefs[0]) {
        const func = IncompleteFunctionType.
          make().
          setCallStrategy(noReceiver).
          setName(name).
          setParameters([]).
          setReturns([]).
          setAstNode(asDefs[0] as AstFunctionDefinitionNode).
          finish();
        mContextType.setLookUp({ [name]: func });
      }
      
      // cvar is set later by it's := or = operator
      const lookUp = VariableDeclarationFunctionTable.
        make( element.type, element.operator, counter() );
      mContextType.setLookUpTable({ [`.${name}`]: lookUp });
      return type;
    }

    const mObjectTable = ObjectLookUpTable.
      make().
      addBuiltinTypes().
      addType(mContextType);

    function lookUpOnContextType(operation: string): FunctionLookUpTable {
      return mContextType.lookUp(operation) ?? (() => {
        throw new Error(`Undeclared "${operation}"`);
      })();
    }

    const inst = freeze({
      declareVariable,
      executionTypeOf: (node: AstNode) => node.executionType(mObjectTable),
      functionLookUpFor: (name: string): FunctionLookUpTable | undefined =>
        mContextType.lookUp(`.${name}`),
      lookUpOnContextType,
      onContextTypeFor<Type>(
        objType: ObjectType | undefined, fn: () => Type):
        Type | undefined
      {
        if (objType?.uid === mContextType.uid) {
          return fn();
        }
        return undefined;
      },
    });
    return inst;
  }

  return freeze({ make });
})();
