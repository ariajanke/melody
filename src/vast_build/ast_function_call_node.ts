import { AstNode } from './ast_node';
import { AstTupleNode } from './ast_tuple_node';
import { AstFringeNode } from './ast_fringe_node';
import { type AstNodeVisitor } from './ast_node_visitor';
import { ObjectTypeResolution } from '../object_type_resolution';
import { Helpers, StandardError, StandardErrorMessage } from '../helpers';
import { ObjectType } from '../object_type';
import { FunctionType } from '../function_type';
import { FunctionLookUpTable } from '../function_look_up_table';
import { ObjectLookUpTable } from '../object_look_up_table';
import { AstIdentifierNode } from './ast_identifier_node';
import { AstStringLiteralNode } from './ast_string_literal_node';
import { ContextType } from '../context_type';

const { freeze, memoize } = Helpers;

export interface FunctionTypeResolution {
  resolve: () => FunctionType | undefined,
  error: () => StandardErrorMessage
};

export interface AstFunctionCallNode extends AstNode {
  // name: string,
  alwaysAsName(): string,
  arguments: AstTupleNode
  functionTypeBy: (lookUpTable: FunctionLookUpTable, parameterType: ObjectType) => FunctionTypeResolution
};

export const AstFunctionCallNode = (() => {
  const { type, hasCreated } = AstNode.makeTypeClassMethods();

  // equally import, is *what* is receiving the call
  // askInteger() the current context
  // 1 + 2 one receives a "+" call

  function contextReceiverDummyNode(): AstIdentifierNode {
    const inst = freeze({
      value: () => {
        throw new Error('Special context type cannot have a value');
      },
      visit: <AccumulationType>(visitor: AstNodeVisitor<AccumulationType>): AccumulationType =>
        visitor.visitIdentifier(inst),
      type: AstIdentifierNode.type,
      executionType: (objTable: ObjectLookUpTable) => 
        objTable.lookUpByName(ContextType.typeName()),
      asString: ContextType.contextMethodName,
      // contextMethodName: ContextType.contextMethodName, // call by "$<context>"
      asName: ContextType.contextMethodName,
      uid: memoize(Symbol)
    });
    return inst;
  }

  function makeWithContextReceiver(mName: AstFringeNode, mArgNode: AstNode) {
    return make(contextReceiverDummyNode(), mName, mArgNode);
  }

  function make(mReceiver: AstNode, mName: AstFringeNode, mArgNode: AstNode): AstFunctionCallNode
  {
    const mArguments: AstTupleNode = (() => {
      if (AstTupleNode.hasCreated( mArgNode )) {
        return mArgNode as AstTupleNode;
      }
      return AstTupleNode.make(',', [mArgNode]);
    })();

    const name: string = (() => {
      // switch on type... nice
      switch (mName.type()) {
      case AstIdentifierNode.type():
      case AstStringLiteralNode.type():
        return (mName as AstFringeNode).asString();
      default: throw new Error('unhandled');
      }
    })();

    function functionType(objTable: ObjectLookUpTable):
      FunctionTypeResolution
    {
      const res = mReceiver.executionType(objTable);
      const recType = res.resolve();
      if (!recType) {
        return freeze({
          resolve: (): FunctionType | undefined => undefined,
          error: res.error
        });
      }
      
      const res2 = mArgNode.executionType(objTable);
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
      return inst.functionTypeBy(funcLookUp, argsType);
    }

    const inst: AstFunctionCallNode = freeze({
      // name,
      asString: () => `${mReceiver.asString()}.${name}(...)`,
      arguments: mArguments,
      visit: <AccumulationType>(visitor: AstNodeVisitor<AccumulationType>): AccumulationType =>
        visitor.visitFunctionCall(inst, mReceiver, mArguments),
      type,
      functionTypeBy(lookUpTable: FunctionLookUpTable, parameterType: ObjectType): FunctionTypeResolution {
        const func = lookUpTable.byParameters(parameterType);
        const err = StandardError.make();
        if (!func) {
          err.
            setErrorMessage(`Could not find an implementation for ` +
                            `${inst.asString()} given parameters ` +
                            parameterType.name());
        }
        return freeze({
          resolve: () => func,
          error: err.error
        });
      },
      executionType: (objTbl: ObjectLookUpTable): ObjectTypeResolution => {
        const res = functionType(objTbl);
        const func = res.resolve();
        if (!func) {
          return freeze({
            resolve: (): ObjectType | undefined => undefined,
            error: res.error
          }) satisfies ObjectTypeResolution;
        }

        const { error, setErrorFn, hasErrorSet } = StandardError.make();
        const objTypes = func.returns().decompose().map((objType: ObjectType) => {
          const { resolve, error } = objTbl.lookUpByType(objType);
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
          makeFixedForType(ObjectType.asTuple(objTypes as ObjectType[]));
      },
      alwaysAsName: () => name,
      asName: () => name,
      uid: memoize(Symbol)
    });

    return inst;
  }

  return freeze({ make, hasCreated, type, makeWithContextReceiver });
})();
