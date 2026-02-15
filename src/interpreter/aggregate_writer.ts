import { FunctionType } from '../function_type_build';
import { Helpers } from '../helpers';
import { InterpretedCodeWriter } from './interpreted_code_writer';
import { StringPool } from '../string_pool';
import { InterpretedCodeRunner } from './interpreted_code_runner';
import { FunctionTypeIndexGrabber } from '../function_type_index_grabber';

const { freeze, memoize } = Helpers;

function make
  (mStringPool: StringPool,
   mInjections = InterpretedCodeWriter.defaultInjections())
{
  type CodeIndex = number | undefined;

  const mIndexGrabber = FunctionTypeIndexGrabber.make();  
  const mIndexJumpTable: { [funcIndex: number]: CodeIndex } = {};
  const mCode: (string | number)[] = [];

  return freeze({
    incorporate(implementation: FunctionType, indexEmission: FunctionType) {
      const codeWriter = InterpretedCodeWriter.make();
      implementation.emit(codeWriter);
      const code = codeWriter.code();

      const index = mIndexGrabber.grabFrom(indexEmission);
      mIndexJumpTable[index] = mCode.length;
      mCode.push(...code, 'functionEnd');
    },
    runner: memoize(() => InterpretedCodeRunner.make(
      mCode,
      mIndexJumpTable,
      mStringPool,
      mInjections
    ))
  });
}

export const AggregateWriter = freeze({ make });
