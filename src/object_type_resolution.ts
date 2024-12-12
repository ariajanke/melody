
import { Helpers, StandardError, StandardErrorFn } from './helpers';
import { ObjectType } from './object_type';

const { freeze } = Helpers;

export interface ObjectTypeResolution {
  resolve: () => ObjectType | undefined,
  error: StandardErrorFn
}

export const ObjectTypeResolution = freeze({
  makeFixedForType: (object: ObjectType): ObjectTypeResolution =>
    freeze({
      resolve: () => object,
      error: () => StandardError.make().error()
    }),
  makeForError: (message: string): ObjectTypeResolution =>
    freeze({
      resolve: () => undefined,
      error: () => freeze({ message })
    })
});
