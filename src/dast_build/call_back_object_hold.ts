import { Helpers, raise } from '../helpers';

const { freeze } = Helpers;

export interface CallBackObjectHold<HeldObjectType> {
  withHeldObject: <ReturnType>(getter: () => HeldObjectType, whileFn: () => ReturnType) => ReturnType
  currentObject(): HeldObjectType;
  optionalCurrentObject(): HeldObjectType | undefined;
};

export type WithHeldObjectFunction<HeldObjectType> =
  CallBackObjectHold<HeldObjectType>['withHeldObject'];

function make<HeldObjectType>
  (mNothingHeldWhat: string = 'held object not set yet')
: CallBackObjectHold<HeldObjectType>
{
  let mHeldObjectGetter: () => HeldObjectType | undefined =
    () => undefined;
  const withHeldObject: CallBackObjectHold<HeldObjectType>['withHeldObject'] =
    <T>(getter: () => HeldObjectType, whileFn: () => T): T =>
  {
    const oldTopContextType = mHeldObjectGetter;
    mHeldObjectGetter = getter;
    const ret = whileFn();
    mHeldObjectGetter = oldTopContextType;
    return ret;
  };

  return freeze({
    withHeldObject,
    currentObject: () =>
      mHeldObjectGetter() ?? raise(mNothingHeldWhat),
    optionalCurrentObject: () => mHeldObjectGetter()
  });
}

export const CallBackObjectHold = freeze({ make });
