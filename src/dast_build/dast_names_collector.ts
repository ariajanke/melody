import { BuiltinFunctionNames } from '../builtin_function_names';
import { DastFunctionNameMappings, DastNode, DastVisitor } from '../dast_build';
import { FunctionNamingSchema } from '../function_naming_schema';
import { Helpers } from '../helpers';
import { Token } from '../token';

const { freeze } = Helpers;

export interface DastNamesCollector {
  collectFromNode(node: DastNode): DastNamesCollector;
  names(): Readonly<string[]>;
};

const visitLiteral = (_0: string) => {};

export type ScanOptions = 'forLetDependeeNames' | 'forFunctionDefinition';

// function initialSetVisitOn(opt: ScanOptions, visitor: () => DastVisitor<void>) {
//   if (opt === 'forLetDependeeNames') {
//     return (_names: readonly string[] | string, node: DastNode) => {
//       node.visit(visitor());
//     };
//   }
//   return (_0: Readonly<string[]> | string, _1: DastNode) => {};
// }

function make(mScanBreadth: ScanOptions): DastNamesCollector {
  const contextName = Token.kContextToken.content;
  const mNames: string[] = [];
  const {
    mapToFringeAccessor, 
    isAnAssignmentName,
    kParentName
  } = FunctionNamingSchema;
  const { isBuiltinFunctionName } = BuiltinFunctionNames;

  const mVisitor: DastVisitor<void> = freeze({
    visitFringe(v: string) {
      if (v === contextName() || isBuiltinFunctionName(v))
        { return; }
      mNames.push(mapToFringeAccessor(v));
    },
    visitString: visitLiteral,
    visitInteger: visitLiteral,
    visitCall(callName: DastNode, receiver: DastNode, args: DastNode) {
      const name = callName.asString();
      if (name &&
          receiver.asString() === contextName() &&
          !isBuiltinFunctionName(name))
      {
        mNames.push(name);
        if (!isAnAssignmentName(name)) {
          mNames.push(mapToFringeAccessor(name));
        }
      }
      
      receiver.visit(mVisitor);
      args.visit(mVisitor);
    },
    visitTuple(inner: Readonly<DastNode[]>)
      { inner.forEach(n => n.visit(mVisitor)); },
    visitInitialSet(_0: readonly string[] | string, node: DastNode) {
      node.visit(mVisitor);
    },
    visitFunctionDefinition(defs: DastFunctionNameMappings, _1: Readonly<DastNode[]>) {
      if (mScanBreadth === 'forLetDependeeNames')
        { return; }
      if (Object.keys(defs.pendingNames).length > 0)
        { mNames.push(kParentName); }
      // NOTE DO NOT recurse further
    }
  });

  const inst = freeze({
    collectFromNode(node: DastNode) {
      node.visit(mVisitor);
      return inst;
    },
    names: () => mNames
  });
  return inst;
}

export const DastNamesCollector = freeze({
  make,
  letDependeeNamesFor(node: DastNode): Readonly<string[]> | undefined {
    return make('forLetDependeeNames').collectFromNode(node).names();
  }
});
