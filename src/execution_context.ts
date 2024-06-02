import { Helpers } from './helpers';
import { ContextVariable } from './context_variable';
import { TypeLookUpTable } from './ast_node';
import { ObjectType } from './object_type';

const { freeze } = Helpers;

export interface ExecutionContext extends TypeLookUpTable {
  declareVariable: (name: string) => ContextVariable,
  getValueOfVariable: (name: string) => string | undefined,
  setVariable: (name: string, value: string) => void,
  getVariable: (name: string) => ContextVariable
}

export const ExecutionContext = (() => {
  function make(): ExecutionContext {
    // I'm not sure about other types
    const mAvailableVariables: { [name: string]: ContextVariable } = {};

    function declareVariable(name: string): ContextVariable {
      if (mAvailableVariables[name]) {
        throw Error(`name "${name}" already taken`);
      }
      return (mAvailableVariables[name] = ContextVariable.make());
    }

    function setVariable(name: string, value: string): void {
      getVariable(name).set(value);
    }

    function getVariable(name: string): ContextVariable {
      const gotten = mAvailableVariables[name];
      if (!gotten) {
        throw Error(`Undeclared variable "${name}"`);
      }
      return gotten;
    }

    function getValueOfVariable(name: string): string | undefined {
      return getVariable(name).asString();
    }

    function lookUpIdentifierType(identifierName: string): ObjectType {
      return getVariable(identifierName).type();
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
