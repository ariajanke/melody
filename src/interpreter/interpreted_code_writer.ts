import { Helpers } from '../helpers';
import { CodeWriter } from '../code_writer';
import { defaultInjections } from './default_injections';

const { freeze } = Helpers;

interface InterpretedCodeWriter extends CodeWriter {
  code(): readonly (string | number)[];
}
function construct2(): InterpretedCodeWriter {
  const mCode: (string | number)[] = [];

  const kMethodNames = [
    'addIntegers',
    'askInteger',
    'askString',
    'printString',
    'printInteger',
    'drop',
    'multiplyIntegers',
    'subtractIntegers'
  ] as const satisfies (keyof CodeWriter)[];

  const kNumMethodNames = [
    'indirectCall',
    'loadInteger',
    'pushRepresentation',
    'storeInteger'
  ] as const satisfies (keyof CodeWriter)[];

  const writer: InterpretedCodeWriter = freeze(
    Object.assign(
    {
      code: () => mCode
    },
    ...kMethodNames.map(name =>
      ({
        [name]: (): CodeWriter => {
          mCode.push(name);
          return writer;
        }
      })),
    ...kNumMethodNames.map(name =>
      ({
        [name]: (n: number): CodeWriter => {
          mCode.push(name, n);
          return writer;
        }
      }))
    )
  ) as InterpretedCodeWriter;
  return writer;
}


export const InterpretedCodeWriter = freeze({
  make: construct2,
  defaultInjections
});
