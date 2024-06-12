import { Helpers } from '../helpers';

export const CharacterClass = (() => {

  const { freeze, safeOneCharJumpTable } = Helpers;
  const { assign } = Object;

  const classes = freeze({
    numeric   : Symbol(),
    alphabetic: Symbol(),
    operative : Symbol(),
    spacious  : Symbol(),
    newLine   : Symbol(),
    literal   : Symbol()
  });

  function arrayAsCharacterSetFor(arr: string[], characterClass: symbol) {
    return arr.
      map((k: string) => ({ [k]: characterClass })).
      reduce(assign);
  }

  const kCharacterToCharacterClass: { [str: string]: symbol } =
    assign(
      {},
      arrayAsCharacterSetFor(
        [
          '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'
        ],
        classes.numeric),
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

  const jumpToClass = safeOneCharJumpTable(kCharacterToCharacterClass);

  return freeze({
    classes,

    classOfString: (character: string): symbol => {
      if (character.length !== 1) {
        throw Error(`"${character}" is not one character`);
      } else if (typeof character !== 'string') {        
        throw Error(`must provide string only`);
      }
      // NOTE limitation in JavaScript
      //      language makes no distinction between numeric/string keys
      //      switch statements are not going to be a supported or even
      //      thought about construct in my scripting language
      // switch (character) {
      // case '1': case '2': case '3': case '4': case '5':
      // case '6': case '7': case '8': case '9': case '0':
      //   return classes.numeric;
      // default: break;
      // }

      // return kCharacterToCharacterClass[character] ?? classes.alphabetic;
      return jumpToClass[character.codePointAt(0) as number] ??
             classes.alphabetic;
    },

    classOfNonKeyword: (tokenContent: string): symbol =>
      CharacterClass.classOfString(tokenContent[0])
  });
})();
