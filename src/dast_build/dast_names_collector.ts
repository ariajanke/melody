import { DastLetDeclarations, DastNode, DastVisitor } from '../dast_build';
import { FunctionNamingSchema } from '../function_naming_schema';
import { Helpers } from '../helpers';
import { Token } from '../token';

const { freeze } = Helpers;

export interface DastNamesCollector {
  collectFromNode(node: DastNode): DastNamesCollector;
  names(): Readonly<string[]>;
};

const visitLiteral = (_0: string) => {};
const visitFunctionDefinition =
  (_0: DastLetDeclarations,
   _1: Readonly<string[]>,
   _2: Readonly<DastNode[]>) => {};

type ScanOptions = 'full' | 'excludeInitialSet';

function initialSetVisitOn(opt: ScanOptions, visitor: () => DastVisitor<void>) {
  if (opt === 'full') {
    return (_names: readonly string[] | string, node: DastNode) => {
      node.visit(visitor());
    };
  }
  return (_0: Readonly<string[]> | string, _1: DastNode) => {};
}

export const DastNamesCollector = freeze({
  make(mScanBreadth: ScanOptions = 'full'): DastNamesCollector
  {
    const contextName = Token.kContextToken.content;
    const mNames: string[] = [];

    const mVisitor: DastVisitor<void> = freeze({
      visitFringe(v: string) {
        if (v === contextName())
          { return; }
        mNames.push(FunctionNamingSchema.mapToFringeAccessor(v));
      },
      visitString: visitLiteral,
      visitInteger: visitLiteral,
      visitCall(callName: DastNode, receiver: DastNode, args: DastNode) {
        const name = callName.asString();
        if (name && receiver.asString() === contextName())
          { mNames.push(name); }
        
        receiver.visit(mVisitor);
        args.visit(mVisitor);
      },
      visitTuple(inner: Readonly<DastNode[]>) {
        inner.forEach(n => n.visit(mVisitor));
      },
      visitInitialSet: initialSetVisitOn(mScanBreadth, () => mVisitor),
      visitFunctionDefinition
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
});
