import { DastLetDeclaration } from '../../dast_build';
import { FunctionLookUpTable } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { MutableFunctionTable } from '../mutable_function_table';
import { ContextAttributeFactory } from './context_attribute_factory';
import { VariableAllocation } from './variable_allocation';

const { freeze, memoize } = Helpers;

export const DeclarationLookUpTable = freeze({
  make(mDecl: DastLetDeclaration,
       mVariableAllocation: VariableAllocation
      ): FunctionLookUpTable 
  {
    const varInfo = memoize(() => {
      const singularName =
        mDecl.accessor?.variableName ?? mDecl.assignment?.variableName;
      const rv = singularName ?
        mVariableAllocation.lookUp(singularName) :
        mVariableAllocation.lookUpTuple(mDecl.initialSet?.variableNames ?? raise('bad decl'));

      return rv ?? raise(`variable was not added yet`);
    });

    const chosenFactory = () => {
      if (mDecl.accessor)
        { return ContextAttributeFactory.buildGetter; }
      if (mDecl.assignment) {
        return ContextAttributeFactory.buildGeneralSetter;
      }
      return ContextAttributeFactory.buildInitialSetter;
    };

    // const implicitlyDeclared

    const ftype = chosenFactory()(varInfo().accessIndex, varInfo().type);

    return MutableFunctionTable.make().setDefinition(varInfo().type, ftype);
  }
});
