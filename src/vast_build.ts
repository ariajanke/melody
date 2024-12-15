import { AstLiteralNode } from './ast_fringe_node';
import { AstFunctionCallNode } from './ast_function_call_node';
import { AstFunctionDefinitionNode } from './ast_function_definition_node';
import { AstIdentifierNode } from './ast_identifier_node';
import { AstIntegerLiteralNode } from './ast_integer_literal_node';
import { AstLetDeclarationNode } from './ast_let_declaration_node';
import { AstNode } from './ast_node';
import { AstNodeVisitor } from './ast_node_visitor';
import { AstStringLiteralNode } from './ast_string_literal_node';
import { AstTupleNode } from './ast_tuple_node';
import { ContextType, ContextTypeInjections, StringPool } from './context_type';
import { ContextTypeRetrieval } from './context_type_retrieval';
import { FunctionLookUpTable } from './function_look_up_table';
import { CallHandlingStrategies, FunctionCompositor, FunctionType, IncompleteFunctionType } from './function_type';
import { FunctionTypeRetrieval } from './function_type_retrieval';
import { Helpers, StandardErrorFn, StandardErrorMessage } from './helpers';
import { ObjectLookUpTable } from './object_look_up_table';
import { ObjectType } from './object_type';
import { PersistentStack } from './persistent_stack';

const { freeze, memoize } = Helpers;

// Validated Abstract Syntax Tree Node, just doesn't quite roll off the tongue

export interface VastNode {
  // valueType
  objectType(): ObjectType,
  functionType(): FunctionType,
  itCanBe(ability: (() => symbol)): boolean,

  // a uid for compilers/interpreters to remember stuff by
  uid(): symbol
}

interface VastFunctionCallNode extends VastNode {
  // on construction
  // - verify (continue or raise) validity
  // - force as much validity by argument types as possible
  // allow receivers:
  // literals may receive:
  //   any defined: ".",
  
}

interface VastFunctionDefinitionNode extends VastNode {
}

// each will have:
// - a context
const VastNode = freeze({
  ableToBe: {
    evaluated: memoize(Symbol)
    // KEEP: reserved for resolved
    // KEEP: reserved for discovered
  },
  itCanBe(...abilities: (() => symbol)[]): (fn: () => symbol) => boolean {
    return (fn: () => symbol) =>
      abilities.findIndex((can: () => symbol) => can() === fn()) > -1;
  }
});

const VastStringLiteralNode = freeze({
  make(mStringType: ObjectType, mValue: number): VastNode {
    const { itCanBe, ableToBe } = VastNode;
    const { noReceiver } = CallHandlingStrategies;
    return freeze({
      objectType: () => mStringType,
      functionType: memoize(() => IncompleteFunctionType.
        make().
        setParameters([]).
        setReturns([mStringType]).
        setCallStrategy(noReceiver).
        setName(`__string_pool(${mValue})`).
        setBuiltin((stack: PersistentStack<number>) => {
          stack.push(mValue);
        }).
        finish()),
      itCanBe: itCanBe(ableToBe.evaluated),
      uid: memoize(Symbol)
    });
  }
});

const VastIntegerLiteralNode = freeze({
  make(mIntegerType: ObjectType, mValue: number): VastNode {
    const { itCanBe, ableToBe } = VastNode;
    const { noReceiver } = CallHandlingStrategies;
    return freeze({
      objectType: () => mIntegerType,
      functionType: memoize(() => IncompleteFunctionType.
        make().
        setParameters([]).
        setReturns([mIntegerType]).
        setCallStrategy(noReceiver).
        setName(`.${mValue}`).
        setBuiltin((stack: PersistentStack<number>) => {
          stack.push(mValue);
        }).
        finish()),
      itCanBe: itCanBe(ableToBe.evaluated),
      uid: memoize(Symbol)
    });
  }
});

const VastIdentifierNode = freeze({
  hasGetter(tbl: FunctionLookUpTable) {
    return !!tbl.byParameters([]);
  },
  make(mDefinedBy: FunctionLookUpTable) {
    const { itCanBe } = VastNode;
    if (!this.hasGetter(mDefinedBy)) {
      throw new Error('Must check if getter exist');
    }
    const mGetter = mDefinedBy.byParameters([]) as FunctionType;
    return freeze({
      objectType: () => ObjectType.makeForTuple(mGetter.returns()),
      functionType: () => mGetter as FunctionType,
      itCanBe: itCanBe(),
      uid: memoize(Symbol)
    }) satisfies VastNode;
  }
});

const VastFunctionDefinitionNode = (() => {
  return freeze({
    make(lineNodes: Readonly<VastNode[]>, mContextType: ObjectType) {
      const { itCanBe } = VastNode;
      // will need for call indicies later, though it need not be defined here
      VastTupleNode.verifyAllZeroParameterFunctions(lineNodes);
      const nodesIntoTypes = () =>
        VastTupleNode.nodesIntoFunctionTypes(lineNodes);
      return freeze({
        objectType: () => mContextType,
        functionType: memoize(() =>
          VastTupleNode.
            functionCompositorFor(nodesIntoTypes()).
            haveReturnNothing().
            finish()),
        itCanBe: itCanBe(),
        uid: memoize(Symbol)
      }) satisfies VastNode;
    }
  });
})();

const VastTupleNode = (() => {
  const class_ = freeze({
    isZeroParameterFunction(node: VastNode) {
      return node.functionType().parameters().length === 0;
    },
    verifyAllZeroParameterFunctions(nodes: Readonly<VastNode[]>) {
      const allZero = nodes.
        map(class_.isZeroParameterFunction).
        reduce((prev: boolean, cur: boolean) => prev && cur);
      if (allZero)
        { return; }
      throw new Error('All nodes must be zero parameter functions');
    },
    functionCompositorFor(funcs: Readonly<FunctionType[]>): FunctionCompositor {
      const compositor = FunctionCompositor.make();
      funcs.forEach((fnType: FunctionType) => {
        fnType.composeWith(compositor);
      });
      return compositor;
    },
    nodesIntoFunctionTypes: (nodes: Readonly<VastNode[]>) =>
      nodes.map((node: VastNode) => node.functionType()),
    make(nodes: Readonly<VastNode[]>) {
      const { itCanBe } = VastNode;
      const funcTypes = (): Readonly<FunctionType[]> =>
        nodes.map((node: VastNode) => node.functionType());
      class_.verifyAllZeroParameterFunctions(nodes);
      return freeze({
        objectType: memoize(() => ObjectType.
          makeForTuple(nodes.map((node :VastNode) => node.objectType()))),
          functionType: memoize(() => class_.functionCompositorFor(funcTypes()).finish()),
          itCanBe: itCanBe(),
          uid: memoize(Symbol)
      }) satisfies VastNode;
    }
  });
  return class_;
})();

const VastFunctionCallNode = freeze({
  // we try and keep validating class methods that can work with both
  // VAST as well as AST nodes
  validateFunctionParameters:
    (functionType: FunctionType,
     parameterType: ObjectType,
     onError: (msg: string) => void): void =>
  {
    let msg: string | undefined = undefined;
    const givenParams = parameterType.decomposeAsParameters();
    const expectedParams = functionType.parameters();
    if (givenParams.length !== expectedParams.length) {
      msg = `function type expected ${expectedParams.length} parameters`; 
    }
    msg || givenParams.forEach((givenParam: ObjectType, idx: number) => {
      const expectedParam = expectedParams[idx];
      if (msg || givenParam.uid() === expectedParam.uid())
        { return; }
      msg = `Parameter (${idx}) expected to be a "${expectedParam.name()}", got a "${givenParam.name()}" instead`;
    });
    msg && onError( msg );
    return undefined;
  },
  make(mFunctionType: FunctionType, mReceiver: VastNode, mParameters: VastNode) {
    VastFunctionCallNode.
      validateFunctionParameters(mFunctionType, mParameters.objectType(), (msg: string) =>
        { throw new Error(msg); });
    
    // the function call itself ought not be seen as taking arguments since it
    // already has them
    const functionType = memoize(() => {
      let mCompositor = FunctionCompositor.make();
      mFunctionType.withCallStrategy().chooseReceiver(() => {
        mCompositor = mReceiver.functionType().composeWith(mCompositor);
      });
      mCompositor = mParameters.functionType().composeWith(mCompositor);
      mCompositor = mFunctionType.composeWith(mCompositor);
      return mCompositor.finish();  
    });
      
    return freeze({
      objectType: memoize(() => ObjectType.makeForTuple( mFunctionType.returns())),
      functionType,
      itCanBe: () => false,
      uid: memoize(Symbol)
    }) satisfies VastNode;
  }
});

export interface VastBuild {
  root(): VastNode | undefined,
  errors(): Readonly<StandardErrorMessage[]>
}

const VastBuildVisitor = freeze({
  make(mErrors: StandardErrorFn[],
       mStringPool: StringPool,
       mContextInjections?: ContextTypeInjections,
       mMakeContextType?: typeof ContextType.make,
       mObjectTable?: ObjectLookUpTable): AstNodeVisitor<VastNode | undefined>
  {
    mObjectTable ??= ObjectLookUpTable.make().addBuiltinTypes();
    mMakeContextType ??= ContextType.make;
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
          make(node, mObjectTable, () => mMakeContextType(mStringPool, mContextInjections));
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

        const rv = VastFunctionDefinitionNode.
          make(vnodes as VastNode[], ctxType);
        mContextTypeStack.pop();
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

export const VastBuild = freeze({
  make(mRoot: AstNode,
       mStringPool?: StringPool,
       mContextInjections?: ContextTypeInjections,
       mMakeContextType?: typeof ContextType.make,
       mObjectTable?: ObjectLookUpTable)
  {
    mStringPool ??= StringPool.make(mRoot);
    mObjectTable ??= ObjectLookUpTable.make().addBuiltinTypes();
    mContextInjections ??= ContextType.defaultInjections();
    mMakeContextType ??= ContextType.make;
    const mErrors: StandardErrorFn[] = [];
    const mVisitor = VastBuildVisitor.
      make(mErrors, mStringPool, mContextInjections, mMakeContextType, mObjectTable);

    return freeze({
      root: memoize(() => mRoot.visit(mVisitor)),
      errors: memoize(() => mErrors.map((fn: StandardErrorFn) => fn()))
    }) satisfies VastBuild;
  }
});
