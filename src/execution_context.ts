import { Helpers, StandardError } from './helpers';
import { ContextVariable } from './context_variable';
import { TypeLookUpTable } from './ast_node';
import { ObjectLookUpTable } from './object_look_up_table';
import { TypeResolution } from './type_resolution';

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

    const [string_resolution, integer_resolution] = (() => {
      const { String, Integer } = ObjectLookUpTable.getBuiltinTypes();
      return [
        TypeResolution.makeFixedForType(String),
        TypeResolution.makeFixedForType(Integer)
      ];
    })();

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

    function lookUpIdentifierType(identifierName: string): TypeResolution {
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

    return freeze({
      lookUpIdentifierType,
      lookUpStringLiteralType: () => string_resolution,
      lookUpIntegerLiteralType: () => integer_resolution,
      declareVariable,
      getValueOfVariable,
      setVariable,
      getVariable
    });
  }

  return freeze({ make });
})();
