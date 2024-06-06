export const CharacterClass = (() => {

  const { freeze, assign } = Object;

  const classes = freeze({
    numeric: Symbol(),
    alphabetic: Symbol(),
    operative: Symbol(),
    spacious: Symbol(),
    newLine: Symbol(),
    literal: Symbol()
  });

  function arrayAsCharacterSetFor(arr: string[], characterClass: symbol) {
    return arr.
      map((k: string) => ({ [k]: characterClass })).
      reduce(assign);
  }

  const kCharacterToCharacterClass =
    assign(
      {},
      // arrayAsCharacterSetFor(
      //   [
      //     '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'
      //   ],
      //   classes.numeric),
      arrayAsCharacterSetFor(
        [
          '=', ':', ',', '.', '(', ')', '{', '}'
        ],
        classes.operative),
      arrayAsCharacterSetFor(
        [
          ' ', '\t', '\r'
        ],
        classes.spacious),
      arrayAsCharacterSetFor(
        [
          '\''
        ],
        classes.literal),
      arrayAsCharacterSetFor(['\n'], classes.newLine));

  function classOf(character: string): symbol {
    if (character.length !== 1) {
      throw Error(`"${character}" is not one character`);
    }
    // I hate JavaScript
    // I will NOT support switch statements!
    // but I *have* to make an exception for this stupid language
    switch (character) {
    case '0': case '1': case '2': case '3': case '4': case '5': case '6':
    case '7': case '8': case '9':
      return classes.numeric;
    default:
      break;
    }

    return kCharacterToCharacterClass[character] ?? classes.alphabetic;
  }

  return freeze({
    classes,
    classOf
  });
})();
