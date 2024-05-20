import { Helpers } from '../src/helpers';

const { freeze } = Helpers;

export const TestHelpers = freeze({
  describeNamed,
  fdescribeNamed
});

function describeNamed(obj: object, descFn: () => void): void {
  describe(Object.keys(obj)[0], descFn);
}

function fdescribeNamed(obj: object, descFn: () => void): void {
  fdescribe(Object.keys(obj)[0], descFn);
}

// export interface InBetween {
//   receivedArguments: any[][]
// }

// export const InBetween = freeze({
//   attachTo: (obj: object, methodName: string): InBetween => {
//     let original: (...args: any) => any = obj[methodName];
//     let receivedArguments: any[][] = [];
//     obj[methodName] = (...args: any): any => {
//       receivedArguments.push(args);
//       return original(...args);
//     };
//     obj['isInBetween'] = true;
//     return freeze({ receivedArguments });
//   }
// });

// export const LazyEvaluate = (() => {
//   function make() {
//     type DeclarationFunction<Type> = (obj?: { set?: () => Type}) => Type;

//     const mOriginalDeclFunctions: { [name: string | symbol]: () => any } = {};
//     const mActiveDeclFunctions: { [name: string | symbol]: () => any } = {};
//     let mValues: { [name: string | symbol]: any } = {};
//     const declOverloads = {
//       string: generalDecl,
//       ['function']: symbolDecl
//     };

//     // public

//     function decl<Type>
//       (nameOrFn: string | (() => Type), fn?: () => Type):
//       DeclarationFunction<Type>
//     { return declOverloads[typeof nameOrFn](nameOrFn, fn); }

//     function clearAllMemoization(): void { mValues = {}; }

//     function clearAllResets(): void {
//       Object.keys(mOriginalDeclFunctions).forEach((name: string) => {
//         mActiveDeclFunctions[name] = mOriginalDeclFunctions[name];
//       });
//     }

//     function retrieve<Type>(name: string): Type
//       { return retr<Type>(name); }

//     // private

//     function symbolDecl<Type>(fn: () => Type): DeclarationFunction<Type> {
//       const handle = Symbol();
//       return generalDecl<Type>(handle, fn);
//     }

//     function generalDecl<Type>
//       (handle: string | symbol, fn: () => Type):
//       DeclarationFunction<Type>
//     {
//       mOriginalDeclFunctions[handle] = mActiveDeclFunctions[handle] = fn;
//       return ({ set }: { set?: () => Type} = {}): Type => {
//         if (typeof set === 'function')
//           { ( mActiveDeclFunctions[handle] = set ); }
//         return retr<Type>(handle);
//       };
//     }

//     function retr<Type>(name: string | symbol): Type
//       { return mValues[name] ??= mActiveDeclFunctions[name](); }

//     return freeze({ decl, clearAllMemoization, retrieve, clearAllResets });
//   }

//   return freeze({ make });
// })();

// Helpers.expose({ LazyEvaluate });

// find src/ | grep -P '(?<!\.d)\.ts$'
