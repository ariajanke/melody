import { DastLetDeclations, DastNode, DastVisitor } from '../dast_build';
import { FunctionNamingSchema } from '../function_naming_schema';
import { Helpers } from '../helpers';
import { Token } from '../token';

const { freeze } = Helpers;

export interface DastNamesCollector {
  collectFromNode(node: DastNode): DastNamesCollector;
  names(): Readonly<string[]>;
  // /** All fringe names encountered at this scope level (raw, may include duplicates). */
  // fringeNames(): readonly string[];
  // /** All call names encountered at this scope level (raw, may include duplicates). */
  // callNames(): readonly string[];
}

const visitLiteral = (_0: string) => {};
const visitFunctionDefinition =
  (_0: DastLetDeclations, _1: Readonly<DastNode[]>) => {};

export const DastNamesCollector = freeze({
  /**
   * Shallowly collect fringe and call names from a set of DAST nodes.
   * Does NOT descend into nested function definitions — those form their own
   * scope and are opaque to this collector.
   *
   * All results are deferred until first access via `fringeNames()`
   * or `callNames()`.
   */
  make(): DastNamesCollector {
    // const mFringeNames: string[] = [];
    // const mCallNames: string[] = [];
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
      visitInitialSet(_names: readonly string[] | string, node: DastNode) {
        node.visit(mVisitor);
      },
      visitFunctionDefinition
    });
    // const collected = memoize((): true => {
    //   const visitor: DastVisitor<void> = freeze({
    //     visitFringe(v: string) {
    //       mNames.push(FunctionNamingSchema.mapToFringeAccessor(v));
    //     },
    //     visitString: visitFringe,
    //     visitInteger: visitFringe,
    //     visitCall(callName: DastNode, receiver: DastNode, args: DastNode) {
    //       const name = callName.asString();
    //       if (name)
    //         { mNames.push(name); }
          
    //       receiver.visit(visitor);
    //       args.visit(visitor);
    //     },
    //     visitTuple(inner: Readonly<DastNode[]>) {
    //       inner.forEach(n => n.visit(visitor));
    //     },
    //     visitInitialSet(_names: readonly string[] | string, node: DastNode) {
    //       node.visit(visitor);
    //     },
    //     visitFunctionDefinition
    //   });
    //   return true;
    // });

    const inst = freeze({
      collectFromNode(node: DastNode) {
        node.visit(mVisitor);
        return inst;
      },
      names: () => mNames
      // fringeNames: memoize((): readonly string[] => {
      //   collected();
      //   return freeze(mFringeNames);
      // }),
      // callNames: memoize((): readonly string[] => {
      //   collected();
      //   return freeze(mCallNames);
      // })
    });
    return inst;
  }
});