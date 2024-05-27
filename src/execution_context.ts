import { Helpers } from './helpers';
import { ContextVariable } from './context_variable';
import { TypeLookUpTable } from './ast_node';
import { ObjectType } from './type_system';

const { freeze } = Helpers

export interface ExecutionContext extends TypeLookUpTable {
  declareVariable: (name: string, value: string) => void,
  getValueOfVariable: (name: string) => string | undefined,
  setVariable: (name: string, value: string) => void,
  getVariable: (name: string) => ContextVariable
}

export const ExecutionContext = (() => {
  function make(): ExecutionContext {
    // I'm not sure about other types
    const mAvailableVariables: { [name: string]: ContextVariable } = {};

    function declareVariable(name: string, value: string): void {
      if (mAvailableVariables[name]) {
        throw Error(`name "${name}" already taken`);
      }
      mAvailableVariables[name] = ContextVariable.make(value);
    }

    function setVariable(name: string, value: string): void {
      mAvailableVariables[name].set(value);
    }

    function getVariable(name: string): ContextVariable {
      return mAvailableVariables[name];
    }

    function getValueOfVariable(name: string): string | undefined {
      return mAvailableVariables[name].asString();
    }

    function lookUpIdentifierType(identifierName: string): ObjectType {
      return mAvailableVariables[identifierName].type();
    }

    return freeze({
      lookUpIdentifierType,
      declareVariable,
      getValueOfVariable,
      setVariable,
      getVariable
    });
  }

  return freeze({ make });
})();
