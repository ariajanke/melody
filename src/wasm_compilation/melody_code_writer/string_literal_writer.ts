import { CodeWriter } from '../../code_writer';
import { Helpers } from '../../helpers';

const { freeze } = Helpers;

export interface StringLiteralWriter {
  mapToString(n: number): string | undefined;
  pushLiteralString(str: string): CodeWriter;
};

function make
  (getInst: () => CodeWriter): StringLiteralWriter
{
  const mStrings: string[] = [];
  const mStringMap: { [s: string]: number | undefined } = {};
  return freeze({
    mapToString: (n: number) => mStrings[n],
    pushLiteralString(str: string): CodeWriter {
      if (!mStringMap[str]) {
        mStringMap[str] = mStrings.length;
        mStrings.push(str);
      }

      return getInst().pushInteger(mStringMap[str]);
    }
  })
}

export const StringLiteralWriter = freeze({ make });
