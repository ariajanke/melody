import { ContextType, ContextTypeInjections } from '../context_type';
import { Helpers, StandardErrorMessage } from '../helpers';
import { ObjectLookUpTable } from '../object_look_up_table';
import { ObjectType } from '../object_type';
import { StringPool } from '../string_pool';
import { VastIdentifierNode, VastNode } from '../vast_node';
import { VastTupleNode } from '../vast_tuple_node';
import { WritableObjectType } from '../writable_object_type';
import { AstIdentifierNode } from './ast_identifier_node';
import { AstLetDeclarationNode } from './ast_let_declaration_node';
import { AstNode } from './ast_node';
import { AstNodeVisitor } from './ast_node_visitor';
import { AstTupleNode } from './ast_tuple_node';
import { FunctionCallVisitorPart } from './vast_build_visitor/function_call_visitor_part';
import {
  DeeperInstFactory,
  FunctionDefinitionVisitorPart,
} from './vast_build_visitor/function_definition_visitor_part';
import { LetExpressionPublisher } from './vast_build_visitor/let_expression_publisher';
import { LiteralNodeVisitorPart } from './vast_build_visitor/literal_node_visitor_part';

const { freeze, memoize, presenceAsserted } = Helpers;

export interface VastNodeResolution {
  node(): VastNode | undefined,
  errors(): StandardErrorMessage[]
}

export const VastNodeResolution = freeze({
  makeForVastNode(node: VastNode) {
    return freeze({
      node: () => node,
      errors() { throw new Error('should not call this'); }
    });
  },
  makeForError(message: string) {
    return freeze({
      node: () => undefined,
      errors: memoize((): StandardErrorMessage[] => [freeze({ message })])
    });
  }
});

export type ProgressedLetElement = Readonly<{
  name: string,
  operator: string,
  dependeeNames: string[],
  declaringNode: AstLetDeclarationNode,
  isFunctionDefining: boolean,
  valueNode: VastNode,
  tuplePosition: number | undefined
}>

function constructIdentifierVisitor(mStartedContextType: () => WritableObjectType) {
  function visitIdentifier(node: AstIdentifierNode): VastNodeResolution {
    const lookUpTable = mStartedContextType().
      objectType().
      lookUp(`.${presenceAsserted(node.asName)()}`);
    if (!lookUpTable) {
      return freeze({
        node: () => undefined,
        errors: () => [freeze({ message: `identifier "${node.asString()}" is not defined` })]
      });
    }
    const ft = lookUpTable.byParameters(ObjectType.emptyTupleInstance());
    if (!ft) {
      return freeze({
        node: () => undefined,
        errors: () => [freeze({ message: `no getter exist for "${node.asString()}"` })]
      });  
    }
    return VastNodeResolution.makeForVastNode(VastIdentifierNode.make( ft ));
  }
  return freeze({ visitIdentifier });
}


function constructLetVisitor
  (mGetOwnInstanceRef: () => AstNodeVisitor<VastNodeResolution>,
   mLetPublisher: LetExpressionPublisher)
{
  function visitLetDeclaration(_0: AstLetDeclarationNode, expr: AstNode): VastNodeResolution {
    return mLetPublisher.insideLet(() => expr.visit(mGetOwnInstanceRef()));
  }
  return freeze({ visitLetDeclaration });
}

function constructTupleVisitor(mGetOwnInstanceRef: () => AstNodeVisitor<VastNodeResolution>) {
  function visitTuple(node: AstTupleNode): VastNodeResolution {
    const vnodesRes = node.
      map((node: AstNode) => node.visit(mGetOwnInstanceRef()));
    const errorful: VastNodeResolution[] = [];
    const vnodes: VastNode[] = [];
    vnodesRes.forEach((vnr: VastNodeResolution) => {
      const res = vnr.node();
      if (res) {
        vnodes.push(res);
      } else {
        errorful.push(vnr);
      }
    });

    if (errorful.length > 0) {
      return errorful[0];
    }

    return VastNodeResolution.makeForVastNode( VastTupleNode.make(vnodes) );
  }
  return freeze({ visitTuple });
}

function construct(mStringPool: StringPool,
                   mWritableContextType: WritableObjectType,
                   mObjectTable: ObjectLookUpTable,
                   mStartContextType: () => WritableObjectType): ReturnType<DeeperInstFactory>
{
  
  const mStartedContextType = () => mWritableContextType;
  const getOwnInst = (): AstNodeVisitor<VastNodeResolution> => instance;
  const mLetPublisher = LetExpressionPublisher.make();

  const instance = freeze({
    ...FunctionDefinitionVisitorPart.
      make((mWritableContextType: WritableObjectType) =>
              construct(mStringPool, mWritableContextType, mObjectTable, mStartContextType),
            mObjectTable,
            mStartContextType,
           ),
    ...FunctionCallVisitorPart.
      make(getOwnInst, mObjectTable, mLetPublisher.makeSubscriber()),
    ...constructIdentifierVisitor( mStartedContextType ),
    ...constructLetVisitor( getOwnInst, mLetPublisher ),
    ...constructTupleVisitor(getOwnInst),
    ...LiteralNodeVisitorPart.make(mStringPool, mObjectTable)
  });

  return instance;
}

function make(mStringPool: StringPool,
              mObjectTable?: ObjectLookUpTable,
              mStartContextType?: typeof ContextType.makeWritable,
              mContextInjections?: ContextTypeInjections)
{
  mObjectTable ??= ObjectLookUpTable.make().addBuiltinTypes();
  mStartContextType ??= ContextType.makeWritable;
  const makeContext = () => mStartContextType(mContextInjections);
  const context = makeContext();
  return construct(mStringPool, context, mObjectTable, makeContext);
}

export const NewVastBuildVisitor = freeze({ make });
