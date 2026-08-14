import { CodeWriter } from '../../code_writer';
import { FunctionNamingSchema } from '../../function_naming_schema';
import { FunctionType, ObjectType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { TupleObjectType } from '../tuple_object_type';
import { ExtendedAncestorInfo } from './used_ancestor_collection';

export interface AncestorTupleEmission {
  emitterFunction(): (cw: CodeWriter) => void;
};

const { freeze, memoize } = Helpers;
const { emptyTuple } = TupleObjectType;

function parentReferenceOf(obj: ObjectType): FunctionType {
  return obj.lookUp(FunctionNamingSchema.kParentName)?.
             byParameters(emptyTuple()) ??
         raise('cannot find parent reference function <parent>');
}

function make
  (mReferenceType: ObjectType,
   mParentType: ObjectType,
   mAllOrderedAncestorsInfo: Readonly<ExtendedAncestorInfo[]>)
  : AncestorTupleEmission
{
  const startActingAsFirstAncestor = memoize(() => {
    const parentGetter = parentReferenceOf(mReferenceType);    
    const firstAncestorGetter = parentReferenceOf(mParentType);

    return (cw: CodeWriter) => {
      // NOTE we are "acting" with the current SP, therefore we start as acting
      //      as the current stack frame "p_0"
      //      then we switch roles to the parent and subsequently the ancestors
      //      here we start as p_0, get p_1, then as p_1, get p_2
      //      (then continue into hops)
      
      parentGetter.simpleEmit(cw);
      cw.setStackPointer();
      
      firstAncestorGetter.simpleEmit(cw);
    };
  });

  const hopEmissions = memoize(() => 
    mAllOrderedAncestorsInfo.
    map((info: ExtendedAncestorInfo, idx: number) => {
      const isLastAncestor = idx + 1 === mAllOrderedAncestorsInfo.length;
      const ancParentRef = info.type.
        lookUp(FunctionNamingSchema.kParentName)?.
        byParameters(emptyTuple());
      if (!isLastAncestor && !ancParentRef)
        { raise('cannot get subsequent ancestor'); }

      return (cw: CodeWriter) => {
        // NOTE assume top of WASM stack is a pointer to "info's" stack frame
        //      aka "p_k", and that the SP is at info's parent
        if (isLastAncestor && info.use === 'used')
          { return; }

        if (isLastAncestor && info.use === 'unused') { 
          cw.drop();
          return;
        }

        // NOTE save a copy of p_k
        if (info.use === 'used') {
          cw.duplicateTop();
        }

        // NOTE now we act as p_k where k is (2 to n)
        //      ...get p_{k + 1} where k is (2 to n)
        cw.setStackPointer();
        (ancParentRef ?? raise('bad branch')).simpleEmit(cw);

        // NOTE we finish with leaving p_{k + 1} on the stack
      };
  }));

  return freeze({
    emitterFunction: memoize(() => {
      // NOTE must evaluate our members *before* emit is ever called
      if (hopEmissions().length === 0)
        { return (_0: CodeWriter) => {}; }

      const start = startActingAsFirstAncestor();
      return (writer: CodeWriter): void => {
        start(writer);
        hopEmissions().forEach(emitHop => emitHop(writer));
        writer.restoreStackPointerToGlobal();
      };
    })
  });
}

export const AncestorTupleEmission = freeze({ make });
