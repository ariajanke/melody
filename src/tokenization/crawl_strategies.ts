import { CharacterClass } from './character_class';

export const CrawlStrategies = (() => {
  const { freeze } = Object;
  const { classes, classOfString } = CharacterClass;

  function crawlAlphanumeric(input: string, start: number): number {
    const { length } = input;
    for (let i = start + 1; i < length; ++i) {
      switch (classOfString(input[i])) {
      case classes.operative:
      case classes.spacious:
      case classes.literal:
      case classes.newLine:
        return i;
      default: break;
      }
    }
    return length;
  }

  function crawlStringLiteral(input: string, start: number): number {
    const { length } = input;
    for (let i = start + 1; i < length; ++i) {
      if (classOfString(input[i]) === classes.literal) {
        return i + 1; // include the close quote
      }
    }
    return length;
  }

  function crawlOperator(input: string, start: number): number {
    if (start + 1 >= input.length) {
      return start + 1;
    } else if (input[start + 1] === '=' && input[start] !== '=') {
      return start + 2;
    }
    return start + 1;
  }

  function crawlSpace(input: string, start: number): number {
    const { length } = input;
    for (let i = start + 1; i < length; ++i) {
      switch (classOfString(input[i])) {
      case classes.alphabetic:
      case classes.numeric:
      case classes.operative:
      case classes.literal:
      case classes.newLine:
        return i;
      default: break;
      }
    }
    return length;
  }

  function crawlNewLines(input: string, start: number): number {
    const { length } = input;
    for (let i = start + 1; i < length; ++i) {
      if (classOfString(input[i]) !== classes.newLine) {
        return i;
      }
    }
    return length;
  }

  function crawlNumeric(input: string, start: number): number {
    const { length } = input;
    for (let i = start + 1; i < length; ++i) {
      if (classOfString(input[i]) !== classes.numeric) {
        return i;
      }
    }
    return length;
  }

  return freeze({
    [classes.alphabetic]: crawlAlphanumeric ,
    [classes.literal   ]: crawlStringLiteral,
    [classes.operative ]: crawlOperator     ,
    [classes.numeric   ]: crawlNumeric      ,
    [classes.spacious  ]: crawlSpace        ,
    [classes.newLine   ]: crawlNewLines
  });
})();
