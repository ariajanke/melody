import { Helpers } from './helpers';
import { ContextVariable } from './context_variable';

const { freeze } = Helpers

export interface ExecutionContext {
  declareVariable: (name: string, value: string) => void,
  getValueOfVariable: (name: string) => string | undefined,
  setVariable: (name: string, value: string) => void
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

    function getValueOfVariable(name: string): string | undefined {
      return mAvailableVariables[name].asString();
    }

    return freeze({ declareVariable, getValueOfVariable, setVariable });
  }

  return freeze({ make });
})();
