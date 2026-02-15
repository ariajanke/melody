import { FunctionRegistryBuild } from './function_registry_build';
import { FunctionTypeIndexGrabber } from './function_type_index_grabber';
import { Helpers } from './helpers';
import { InterpretedCodeWriter } from './interpreter/interpreted_code_writer';
import { defaultInjections } from './interpreter/default_injections';
import { AggregateWriter } from './interpreter/aggregate_writer';

const { freeze } = Helpers;

export interface Interpreter {
  run(): boolean;
  error(): string | undefined;
}

function make
  (mSource: string,
   mInjections = InterpretedCodeWriter.defaultInjections())
  : Interpreter
{
  let mError: string | undefined = undefined;
  return freeze({
    run(): boolean {
      const build = FunctionRegistryBuild.make(mSource);
      const { functionRegistry, stringPool, rootIndexEmission } = build;
      // recall: functions are memoized!
      if (!functionRegistry() || !stringPool()) {
        mError = build.error();
        return false;
      }

      const aggregateWriter = AggregateWriter.make(stringPool()!, mInjections);
      functionRegistry()!.forEach(aggregateWriter.incorporate);
      const { grabFrom } = FunctionTypeIndexGrabber.make();
      const runner = aggregateWriter.runner();
      runner.beginAt(grabFrom(rootIndexEmission()!) ?? (() => {
        throw new Error('Failed to grab index for entry point');
      })());
      return runner.run();
    },
    error() {
      return mError;
    }
  });
}

export const Interpreter = freeze({ make, defaultInjections });

Helpers.expose({ Interpreter });
