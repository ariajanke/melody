import { Helpers } from '../helpers';

export const CharacterClass = (() => {

  const { freeze } = Helpers;

  function safeOneCharJumpTable
    (charsPairs: [number | undefined, symbol][]):
    symbol[]
  {
    const arr: symbol[] = [];
    charsPairs.forEach((pair: [number | undefined, symbol]) => {
      if (pair[0])
        arr[pair[0]] = pair[1];
    });

    return arr;
  }

  const classes = freeze({
    numeric   : Symbol(),
    alphabetic: Symbol(),
    operative : Symbol(),
    spacious  : Symbol(),
    newLine   : Symbol(),
    literal   : Symbol()
  });

  function arrayAsCharacterSetFor(arr: string[], characterClass: symbol): [number | undefined, symbol][] {
    return arr.
      map((k: string) => ([k.codePointAt(0), characterClass]));
  }

  const kCharacterToCharacterClass: [number | undefined, symbol][] =
    [
      ...arrayAsCharacterSetFor(
        [
          '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'
        ],
        classes.numeric),
      ...arrayAsCharacterSetFor(
        [
          '=', ':', ',', '.', '(', ')', '{', '}', '*', '+', '*'
        ],
        classes.operative),
      ...arrayAsCharacterSetFor(
        [
          ' ', '\t', '\r'
        ],
        classes.spacious),
      ...arrayAsCharacterSetFor(
        [
          '\''
        ],
        classes.literal),
      ...arrayAsCharacterSetFor(['\n'], classes.newLine)
    ];

  const jumpToClass = safeOneCharJumpTable(kCharacterToCharacterClass);

  return freeze({
    classes,

    classOfString: (character: string): symbol => {
      if (character.length !== 1) {
        throw Error(`"${character}" is not one character`);
      } else if (typeof character !== 'string') {        
        throw Error(`must provide string only`);
      }

      return jumpToClass[character.codePointAt(0) as number] ??
             classes.alphabetic;
    },

    classOfNonKeyword: (tokenContent: string): symbol =>
      CharacterClass.classOfString(tokenContent[0]),
  });
})();

Helpers.expose({ CharacterClass });
