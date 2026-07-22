import { CodeWriter } from '../code_writer';
import { Helpers } from '../helpers';

const { freeze } = Helpers;

export interface StringLiteralWriter {
  pushLiteralString(str: string): CodeWriter;
};

export interface StringPool {
  mapToString(n: number): string | undefined;
  makeLiteralWriter(getInst: () => CodeWriter): StringLiteralWriter;
}

function make(): StringPool {
  const mStrings: string[] = [];
  const mStringMap: { [s: string]: number | undefined } = {};

  function internString(str: string): number {
    if (!mStringMap[str]) {
      mStringMap[str] = mStrings.length;
      mStrings.push(str);
    }

    return mStringMap[str];
  }

  const mapToString = (n: number) => mStrings[n];

  function makeLiteralWriter(getInst: () => CodeWriter): StringLiteralWriter {
    return freeze({
      pushLiteralString: (str: string): CodeWriter =>
        getInst().pushInteger(internString(str))
    });
  }

  return freeze({ mapToString, makeLiteralWriter });
}

export const StringPool = freeze({ make });
