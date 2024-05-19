
export interface Context {
  declareVariable: (name: string, value: string) => void,
  getValueOfVariable: (name: string) => string | undefined,
  setVariable: (name: string, value: string) => void
}

export const Context = (() => {
  const { freeze } = Object;

  function make(): Context {
    // I'm not sure about other types
    let mAvailableVariables: { [name: string]: string } = {};

    function declareVariable(name: string, value: string) {
      if (mAvailableVariables[name]) {
        throw Error(`name "${name}" already taken`);
      }
      mAvailableVariables[name] = value;
    }

    function setVariable(name: string, value: string) {
      mAvailableVariables[name] = value;
    }

    function getValueOfVariable(name: string): string | undefined {
      return mAvailableVariables[name];
    }

    return freeze({ declareVariable, getValueOfVariable, setVariable });
  }

  return freeze({ make });
})();
