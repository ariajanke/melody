import { Helpers, StandardError } from './helpers';
import { ContextVariable } from './context_variable';
import { ObjectLookUpTable } from './object_look_up_table';
import { ObjectType } from './object_type';
import { IncompleteFunctionType } from './function_type';
import { type PersistentStack } from './persistent_stack';
import { ObjectTypeResolution } from './object_type_resolution';
import { ContextualLookUpTable, type AstNode } from './ast_node';
import { AstFunctionCallNode, type FunctionTypeResolution } from './ast_function_call_node';
import { PutsFunctionLookUpTable } from './function_look_up_table';
import { type LetNameElement } from './let_names_collection';
import { AstFunctionDefinitionNode } from './ast_function_definition_node';

const { freeze, memoize } = Helpers;

export interface ExecutionContext {
  declareVariable: (element: LetNameElement) => ContextVariable,
  getValueOfVariable: (name: string) => string | undefined,
  setVariable: (name: string, value: string) => void,
  getVariable: (name: string) => ContextVariable,
  tryGetVariable: (name: string) => ContextVariable | undefined,
  functionTypeOf: (node: AstFunctionCallNode) => FunctionTypeResolution
  executionTypeOf: (node: AstNode) => ObjectTypeResolution,
  onContextTypeFor: <Type>(objType: ObjectType | undefined, fn: () => Type) => Type | undefined
}

export const ExecutionContext = (() => {
  const makeDefaultContextType =
    memoize(() => ObjectLookUpTable.getBuiltinTypes().Context);
  const makeContextTypeWithInjections =
    ({ putsFunction, askStringFunction }:
     { putsFunction: (s: string) => void, askStringFunction: () => string }) =>
  {
    const objType = ObjectType.make('Context');
    const string_ = ObjectLookUpTable.getBuiltinTypes().String;

    const askString = IncompleteFunctionType.
      make().
      noReceiver().
      setName('askString').
      setArguments([]).
      setReturns([ string_.uid ]).
      setBuiltin((stack: PersistentStack<ContextVariable>) => {
        stack.push().set(askStringFunction());
      }).
      finish();

    const puts = PutsFunctionLookUpTable.make(putsFunction);

    return objType.
      setLookUp({ askString }).
      setLookUpTable({ puts });
  };

  function make(mContextType: ObjectType = makeDefaultContextType()): ExecutionContext {
    // I'm not sure about other types
    
    const mAvailableVariables: { [name: string]: ContextVariable } = {};

    function setVariable(name: string, value: string): void {
      getVariable(name).set(value);
    }

    function tryGetVariable(name: string): ContextVariable | undefined
      { return mAvailableVariables[name]; }

    function getVariable(name: string): ContextVariable {
      const gotten = tryGetVariable(name);
      if (!gotten) {
        throw Error(`Undeclared variable "${name}"`);
      }
      return gotten;
    }

    function getValueOfVariable(name: string): string | undefined {
      return getVariable(name).asString();
    }

    function lookUpIdentifierType(identifierName: string): ObjectTypeResolution {
      const gotten = mAvailableVariables[identifierName];
      if (gotten) {
        return freeze({
          resolve: gotten.type,
          error: () => StandardError.make().error()
        });
      } else {
        const { error, setErrorMessage } = StandardError.make();
        setErrorMessage(`Undeclared variable "${identifierName}"`);
        return freeze({
          resolve: () => undefined,
          error
        });
      }
    }

    function declareVariable(element: LetNameElement): ContextVariable {
      const { name, type } = element;
      if (mAvailableVariables[name]) {
        throw Error(`name "${name}" already taken`);
      }
      const asDefs = element.node.map<AstFunctionDefinitionNode | undefined>((node: AstNode) => {
        if (node.type() === AstFunctionDefinitionNode.nodeType()) {
          return node as AstFunctionDefinitionNode;
        }
        return undefined;
      });
      if (type.name() === 'Function' && asDefs[0]) {
        const func = IncompleteFunctionType.
          make().
          noReceiver().
          setName(name).
          setArguments([]).
          setReturns([]).
          setBuiltin((stack: PersistentStack<ContextVariable>) => {
            stack.push().set(asDefs[0] as AstFunctionDefinitionNode);
          }).
          finish();
        mContextType.setLookUp({ [name]: func });
      }
      return (mAvailableVariables[name] = ContextVariable.make().setType(element.type));
    }

    function onContextTypeFor<Type>(
      objType: ObjectType | undefined,
      fn: () => Type): Type | undefined
    {
      if (objType?.uid === mContextType.uid) {
        return fn();
      }
      return undefined;
    }

    const mLookUpTable: ContextualLookUpTable = freeze({
      ...ObjectLookUpTable.make().addBuiltinTypes(),
      lookUpIdentifierType,
      lookUpContextType: () => contextResolution,
    });

    const lookUpFunctionType: () => ObjectTypeResolution = memoize(() =>
      ObjectTypeResolution.makeFixedForType( ObjectLookUpTable.getBuiltinTypes().Function ));

    const contextResolution = ObjectTypeResolution.makeFixedForType(mContextType);

    const inst = freeze({
      executionTypeOf: (node: AstNode) => node.executionType(mLookUpTable),
      declareVariable,
      getValueOfVariable,
      setVariable,
      getVariable,
      lookUpFunctionType,
      tryGetVariable,
      functionTypeOf: (node: AstFunctionCallNode) => node.functionType( mLookUpTable ),
      onContextTypeFor
    });
    return inst;
  }

  return freeze({ make, makeContextTypeWithInjections });
})();
