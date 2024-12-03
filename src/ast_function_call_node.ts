import { AstNode, ContextualLookUpTable } from './ast_node';
import { AstTupleNode } from './ast_tuple_node';
import { AstFringeNode } from './ast_fringe_node';
import { type AstNodeVisitor } from './ast_node_visitor';
import { ObjectTypeResolution } from './object_type_resolution';
import { Helpers, StandardError, StandardErrorMessage } from './helpers';
import { Token } from './token';
import { ContextVariable } from './context_variable';
import { ObjectType } from './object_type';
import { FunctionType } from './function_type';

const { freeze, memoize } = Helpers;

export interface FunctionTypeResolution {
  resolve: () => FunctionType | undefined,
  error: () => StandardErrorMessage
};

export interface AstFunctionCallNode extends AstNode {
  name: string,
  arguments: AstTupleNode
  functionType: (lookUpTable: ContextualLookUpTable) => FunctionTypeResolution
};

export const AstFunctionCallNode = (() => {
  const nodeTypes = AstNode.types;

  const currentContextReceiver = memoize((): AstFringeNode => {
    const inst = freeze({
      visit: <AccumulationType>(visitor: AstNodeVisitor<AccumulationType>): AccumulationType =>
        visitor.visitFringe(inst),
      type: memoize(Symbol),
      executionType: (types: ContextualLookUpTable) => types.lookUpContextType(),
      asString: () => '<context>',
      evaluate: (_0: (name: string) => ContextVariable) =>
        memoize(ContextVariable.make)(),
      comesBeforeOperator: (_0: Token) => false
    });
    return inst;
  });

  // equally import, is *what* is receiving the call
  // askInteger() the current context
  // 1 + 2 one receives a "+" call
  function make(mReceiver: AstNode, mName: AstFringeNode, mArgNode: AstNode) {
    const mArguments: AstTupleNode = (() => {
      if (mArgNode.type() === nodeTypes.tuple) {
        return mArgNode as AstTupleNode;
      }
      return AstTupleNode.make(',', [mArgNode]);
    })();

    const name: string = (() => {
      // switch on type... nice
      switch (mName.type()) {
      case nodeTypes.identifier:
      case nodeTypes.stringLiteral:
        return (mName as AstFringeNode).asString();
      default: throw new Error('unhandled');
      }
    })();

    const inst: AstFunctionCallNode = freeze({
      name,
      asString: () => `${name}(...)`,
      arguments: mArguments,
      visit: <AccumulationType>(visitor: AstNodeVisitor<AccumulationType>): AccumulationType =>
        visitor.visitFunctionCall(inst, mReceiver, mArguments),
      type: () => nodeTypes.functionCall,
      functionType: (lookUpTable: ContextualLookUpTable): FunctionTypeResolution => {
        const res = mReceiver.executionType(lookUpTable);
        const recType = res.resolve();
        if (!recType) {
          return freeze({
            resolve: (): FunctionType | undefined => undefined,
            error: res.error
          });
        }
        
        const res2 = mArgNode.executionType(lookUpTable);
        const argsType = res2.resolve();
        if (!argsType){
          return freeze({
            resolve: (): FunctionType | undefined => undefined,
            error: res2.error
          });
        }
        const funcLookUp = recType.lookUp(name);
        if (!funcLookUp) {
          return freeze({
            resolve: (): FunctionType | undefined => undefined,
            error: () => freeze({ message: `Function "${name}" is undefined` })
          });
        }
        const func = funcLookUp.byArguments(argsType.decomposeAsArguments());
        const err = StandardError.make();
        return freeze({
          resolve: () => {
            if (!func) {
              return err.
                setErrorMessage('Could not find an implementation for the given arguments');
            }
            return func;
          },
          error: err.error
        });
      },
      executionType: (lookUpTable: ContextualLookUpTable): ObjectTypeResolution => {
        const res = inst.functionType(lookUpTable);
        const func = res.resolve();
        if (!func) {
          return freeze({
            resolve: (): ObjectType | undefined => undefined,
            error: res.error
          }) satisfies ObjectTypeResolution;
        }

        const { error, setErrorFn, hasErrorSet } = StandardError.make();
        const objTypes = func.returns().map((uid: symbol) => {
          const { resolve, error } = lookUpTable.lookUpByType(uid);
          const res = resolve();
          if (res)
            { return res; }
          setErrorFn(error);
          return undefined;
        });
        if (hasErrorSet()) {
          return freeze({
            resolve: () => undefined,
            error
          });
        }

        return ObjectTypeResolution.
          makeFixedForType(lookUpTable.lookUpTuple(objTypes as ObjectType[]));
      }
    });

    return inst;
  }

  return freeze({ make, currentContextReceiver });
})();
