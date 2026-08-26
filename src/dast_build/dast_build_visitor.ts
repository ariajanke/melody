import {
  DastBuild,
  DastNode,
  WritableDastDeclarationMap
} from '../dast_build';
import { Helpers, StandardError } from '../helpers';
import { IastNode, IastVisitor } from '../iast_node';
import { DastCallBuild } from './dast_call_build';
import { DastNode_ } from './dast_node';
import { CallBackObjectHold } from './call_back_object_hold';
import { DastFunctionDefintionBuild } from './dast_function_definition_build';
import { DastTupleBuild } from './dast_tuple_build';
import { DastLetBuild } from './dast_let_build';
import { CarriedNamesRegistry } from './carried_names_registry';
import { Token } from '../token';
import { IastLiteralType } from '../iast_node/iast_types';

const { freeze, memoize } = Helpers;

const visitLiteral = (token: Token, type: IastLiteralType): DastBuild => {
  const { content } = token;
  const node_ = type === 'number' ?
    DastNode_.makeInteger(content()) :
    DastNode_.makeString (content());
  
  return freeze({
    node : () => node_,
    error: () => StandardError.make().error()
  });
};

const visitFringe = (token: Token) => freeze({
  node: memoize(() => DastNode_.makeFringe(token)),
  error: () => StandardError.make().error()
});

function make(): IastVisitor<DastBuild> {
  const mDeclarationHolder = CallBackObjectHold.
    make<WritableDastDeclarationMap>('let declaration stack not set up yet');
  const mCarriedNamesRegistry = CarriedNamesRegistry.make();
  const { currentObject } = mDeclarationHolder;
  const intoDastBuild = (node: IastNode): DastBuild => node.visit(inst);
  function visitLet(innerNode: IastNode): DastBuild {
    return DastLetBuild.make(innerNode, intoDastBuild, currentObject);
  }

  function visitTuple(nodes: Readonly<IastNode[]>): DastBuild {
    return DastTupleBuild.make(nodes, intoDastBuild);
  }

  function visitCall(callName: Token, receiver: IastNode, args: IastNode):
    DastBuild
  {
    return DastCallBuild.
      make(callName.content(),
           intoDastBuild,
           receiver,
           args);
  }

  function visitFunctionDefinition(nodes: Readonly<IastNode[]>): DastBuild {
    return DastFunctionDefintionBuild.
      make(nodes, intoDastBuild, mDeclarationHolder, mCarriedNamesRegistry);
  }

  const inst: IastVisitor<DastBuild> = freeze({
    visitLet,
    visitFringe,
    visitTuple,
    visitCall,
    visitLiteral,
    visitFunctionDefinition
  });
  return inst;
}

export const DastBuildVisitor = freeze({ make });
