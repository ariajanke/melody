import { CodeWriter } from '../code_writer';
import { DastNode } from '../dast_build';
import { FunctionNamingSchema } from '../function_naming_schema';
import { FunctionType, FunctionTypeBuild } from '../function_type_build';
import { Helpers, StandardError, raise } from '../helpers';
import { FunctionTypeBase } from './function_type_base';
import { StackSafetyChecker } from './stack_safety_checker';
import { TupleObjectFactory } from './tuple_type';

const { freeze, memoize } = Helpers;
const { kAssignmentOperator } = FunctionNamingSchema;

const kLogToConsole = false;
const kAssignmentNotAValidCallName =
  `"${kAssignmentOperator}" is not a valid call name, DAST build should have ` +
  `stripped it out and replaced it with the appropriate fringe accessor`;

function make
  (mCallName: DastNode,
   mReceiver: DastNode,
   mArgs: DastNode,
   mGetContextSizeInBytes: () => number,
   mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild)
  : FunctionTypeBuild
{
  const { error, setErrorMessage, setErrorFn } = StandardError.make();

  const callNameStr = memoize((): string | undefined => {
    const callNameStr = mCallName.asString();
    if (!callNameStr) {
      return setErrorMessage('Cannot use node as a call name');
    } else if (callNameStr === kAssignmentOperator) {
      throw new Error(kAssignmentNotAValidCallName);
    }

    if (kLogToConsole) {
      console.log(`Looking up call "${callNameStr}" on receiver ` +
                  `"${mReceiver.asString()}" with args "${mArgs.asString()}"`);
    }
    return callNameStr;
  });

  const lexicalReceiver = memoize(() => {
    const receiverBuild = mIntoFunctionTypeBuild(mReceiver);
    return receiverBuild.functionType() ?? setErrorFn(receiverBuild.error);
  });

  const args = memoize(() => {
    const argsBuild = mIntoFunctionTypeBuild(mArgs);
    return argsBuild.functionType() ?? setErrorFn(argsBuild.error);
  });

  const callFunctionType = memoize(() => {
    const lexRec = lexicalReceiver();
    if (!lexRec || !args()) { return; }

    const callFunctionType = lexRec.
      returns().
      lookUp(callNameStr()!)?.
      byParameters( args()!.returns() );
    if (!callFunctionType) {
      const msg =
        `cannot find function "${callNameStr()}" ` +
        `on receiver "${mReceiver.asString()}" ` +
        `(type: "${lexRec.returns().name()}") ` +
        `for args "${mArgs.asString()}"`;
      return setErrorMessage(msg);
    }
    return callFunctionType;
  });

  const actualReceiver = memoize(() => {
    if (!callFunctionType())
      { return undefined; }
    const { alternateReceiver } = callFunctionType()!;
    if (!alternateReceiver()) {
      return lexicalReceiver();
    }

    return lexicalReceiver()?.
      returns().
      lookUp(alternateReceiver()!)?.
      byParameters(emptyTuple());
  });
  
  const { emptyTuple } = TupleObjectFactory;

  const optionalIndexAccessor = memoize(() => {
    const indexAccessorName = FunctionNamingSchema.
      mapToFringeAccessor(callNameStr()!);
    // for delegates: if we define "f" on the current context
    // we also define a ".f" 
    return lexicalReceiver()?.
      returns().
      lookUp(indexAccessorName)?.
      byParameters(emptyTuple());
  });

  const functionType = memoize((): FunctionType | undefined => {
    if (!callFunctionType())
      { return undefined; }
  
    const compositeFunctionType = freeze({
      ...FunctionTypeBase.receivedByNone(),
      returns: () => callFunctionType()!.returns(),
      emit(writer: CodeWriter) {
        const contextSize = mGetContextSizeInBytes();
        if (contextSize < 0) {
          raise(`Context size cannot be negative, got ${contextSize}`);
        }

        actualReceiver()!.emit(writer);
        args()!.emit(writer);
        // NOTE
        // mechanics of call
        // To handle indirect calls, special handling is needed. Consider these
        // examples:
        // - with "puts" you will not find ".puts"
        // - with "f" you will find ".f"
        // NOTE
        // the function is *always* expected to consume it's parameters
        // need function index for user defined functions
        optionalIndexAccessor()?.emit(writer);
        // down here so our loads/stores stay sane
        if (optionalIndexAccessor()) {
          writer.
            pushRepresentation( contextSize ).
            incrementStackPointer();
        }
        callFunctionType()!.emit(writer);
        if (optionalIndexAccessor()) {
          writer.forStackPointer('restoreToGlobal');
        }
        return writer;
      }
    });

    if (kLogToConsole) {
      const { parameters, returns } = compositeFunctionType;
      console.log(`Call "${callNameStr}" as composite ftype ` +
                  `taking ${parameters().name()} returning ` +
                  `"${returns().name()}" ` +
                  `received by "${mReceiver.asString()}" `+
                  `(${optionalIndexAccessor() ? 'is' : 'is not'} an indirect call)`);
    }
    StackSafetyChecker.make().check(compositeFunctionType);

    return compositeFunctionType;
  });

  return freeze({ functionType, error });
}

export const CallFunctionTypeBuild = freeze({ make });
