// Module internals
import { AstLiteralNode } from './ast_fringe_node';
import { AstFunctionCallNode } from './ast_function_call_node';
import { AstFunctionDefinitionNode } from './ast_function_definition_node';
import { AstIdentifierNode } from './ast_identifier_node';
import { AstIntegerLiteralNode } from './ast_integer_literal_node';
import { AstLetDeclarationNode } from './ast_let_declaration_node';
import { AstNodeVisitor } from './ast_node_visitor';
import { AstStringLiteralNode } from './ast_string_literal_node';
import { AstTupleNode } from './ast_tuple_node';
import { FunctionTypeRetrieval } from './function_type_retrieval';
// External
import { ContextType, ContextTypeInjections } from '../context_type';
import { ContextTypeRetrieval } from '../vast_build/context_type_retrieval';
import { Helpers, StandardErrorFn } from '../helpers';
import { ObjectLookUpTable } from '../object_look_up_table';
import { ObjectType } from '../object_type';
import { VastNode, VastIdentifierNode } from '../vast_node';
import { StringPool } from '../string_pool';
import { VastFunctionCallNode } from '../vast_function_call_node';
import { VastTupleNode } from '../vast_tuple_node';
import { VastFunctionDefinitionNode } from '../vast_function_definition_node';
import { VastIntegerLiteralNode, VastStringLiteralNode } from '../vast_literal_node';
import { AstNode } from './ast_node';

const { freeze } = Helpers;

export const VastBuildVisitor = freeze({
  make(mErrors: StandardErrorFn[],
       mStringPool: StringPool,
       mContextInjections?: ContextTypeInjections,
       mStartContextType?: typeof ContextType.makeWritable,
       mObjectTable?: ObjectLookUpTable): AstNodeVisitor<VastNode | undefined>
  {
    mObjectTable ??= ObjectLookUpTable.make().addBuiltinTypes();
    mStartContextType ??= ContextType.makeWritable;
    const mContextTypeStack: ObjectType[] = [];
    const mFunctionRetrieval = FunctionTypeRetrieval.make();
    function topContextType() {
      return mContextTypeStack[mContextTypeStack.length - 1] ?? (() => {
        throw new Error('Must start at a function definition node');
      })();
    }
    const inst = freeze({
      visitFunctionCall:
        (node: AstFunctionCallNode, receiver: AstNode, fArgs: AstTupleNode):
        VastNode | undefined =>
      {
        const func = mFunctionRetrieval.
          reset(node, receiver, fArgs, mObjectTable, topContextType()).
          retrievedType();
        if (!func) {
          mErrors.push(mFunctionRetrieval.error);
          return undefined;
        }
        const recAsVast = receiver.visit(inst);
        const argsAsVast = fArgs.visit(inst);
        if (!recAsVast || !argsAsVast)
          { return undefined; }
        VastFunctionCallNode.
          validateFunctionParameters(func, argsAsVast.objectType(), (message: string) => {
            mErrors.push(() => freeze({ message }));
          });
        if (mErrors.length > 0)
          { return undefined; }
        return VastFunctionCallNode.make(func, recAsVast, argsAsVast);
      },
      visitLetDeclaration: (_0: AstLetDeclarationNode, rhs: AstNode): VastNode | undefined =>
        rhs.visit(inst),
      visitIdentifier: (node: AstIdentifierNode): VastNode | undefined => {
        const lookUpTable = topContextType().lookUp(node.contextMethodName());
        if (!lookUpTable) {
          mErrors.push(() => freeze({ message: `identifier "${node.asString()}" is not defined` }));
          return undefined;
        }
        if (!VastIdentifierNode.hasGetter(lookUpTable)) {
          mErrors.push(() => freeze({ message: `no getter exist for "${node.asString()}"` }));
          return undefined;
        }
        return VastIdentifierNode.make( lookUpTable );
      },
      visitTuple: (node: AstTupleNode): VastNode | undefined => {
        let allDefined = true;
        const vnodes = node.
          map((node: AstNode) => node.visit(inst) ?? (allDefined = false));
        if (!allDefined) {
          return undefined;
        }

        return VastTupleNode.make(vnodes as VastNode[]);
      },
      visitFunctionDefinition: (node: AstFunctionDefinitionNode, lineNodes: AstNode[]):
        VastNode | undefined =>
      {
        const ctxRet = ContextTypeRetrieval.
          make(node, mObjectTable, () => mStartContextType(mContextInjections));
        const ctxType = ctxRet.resolve();
        if (!ctxType) {
          mErrors.push(ctxRet.error);
          return undefined;
        }
        mContextTypeStack.push(ctxType);
        mObjectTable.addType(ctxType);
        let allDefined = true;
        const vnodes = lineNodes.
          map((node: AstNode) => node.visit(inst) ?? (allDefined = false));
        if (!allDefined) {
          return undefined;
        }
        const resv = mObjectTable.lookUpByName('Function');
        const funcType = resv.resolve();
        if (!funcType) { 
          throw new Error(resv.error().message);
        }
        const rv = VastFunctionDefinitionNode.
          make(vnodes as VastNode[], funcType);
        mContextTypeStack.pop();
        // oh gawd
        if (mContextTypeStack.length > 0)
          mObjectTable.addType(topContextType());
        return rv;
      },
      visitLiteral: (node: AstLiteralNode): VastNode | undefined => {
        const asLiteralNode = (node as AstLiteralNode);
        if (AstStringLiteralNode.hasCreated(node)) {
          const res = mObjectTable.lookUpByName('String');
          const stringType = res.resolve();
          if (!stringType) {
            mErrors.push(res.error);
            return undefined;
          }
          return VastStringLiteralNode.
            make(stringType, asLiteralNode.value(mStringPool));
        }
        if (!AstIntegerLiteralNode.hasCreated(node)) {
          mErrors.push(() => freeze({ message: 'literal nodes must be either strings or integers' }));
          return undefined;
        }
        const res = mObjectTable.lookUpByName('Integer');
        const intType = res.resolve();
        if (!intType) {
          mErrors.push(res.error);
          return undefined;
        }
        return VastIntegerLiteralNode.
          make(intType, asLiteralNode.value(mStringPool));
      }
    }) satisfies AstNodeVisitor<VastNode | undefined>;
    return inst;
  }
});
