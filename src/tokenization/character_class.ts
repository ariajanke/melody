import { Helpers } from  '../helpers';

const characterClassNames =
  [
    'numeric'   ,
    'alphabetic',
    'operative' ,
    'spacious'  ,
    'newLine'   ,
    'literal'
  ] as const;

export type CharacterClassName = typeof characterClassNames[number];

export const CharacterClass = (() => {

  const { freeze } = Helpers;

  function safeOneCharJumpTable
    (charsPairs: [number | undefined, CharacterClassName][]):
    CharacterClassName[]
  {
    const arr: CharacterClassName[] = [];
    charsPairs.forEach((pair: [number | undefined, CharacterClassName]) => {
      if (pair[0])
        arr[pair[0]] = pair[1];
    });

    return arr;
  }

  const classes = Helpers.toNamedMap(characterClassNames);

  function arrayAsCharacterSetFor
    (arr: string[], characterClass: CharacterClassName):
    [number | undefined, CharacterClassName][]
  {
    return arr.
      map((k: string) => ([k.codePointAt(0), characterClass]));
  }

  const kCharacterToCharacterClass: [number | undefined, CharacterClassName][] =
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

    classOfString: (character: string): CharacterClassName => {
      if (character.length !== 1) {
        throw Error(`"${character}" is not one character`);
      } else if (typeof character !== 'string') {        
        throw Error(`must provide string only`);
      }

      return jumpToClass[character.codePointAt(0) as number] ??
             classes.alphabetic;
    },

    classOfNonKeyword: (tokenContent: string): CharacterClassName =>
      CharacterClass.classOfString(tokenContent[0]),
  });
})();
