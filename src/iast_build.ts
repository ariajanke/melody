// import { TreePartBuild } from './iast_build/tree_part_build';
// import { BuildState } from './iast_build/build_state';
// import { TokenRange } from './token_range';
// import { Helpers, raise } from './helpers';
// import { IastNode } from './iast_node';
import { IastBuild_ } from "./iast_build/scrap";

export type  IastBuild = IastBuild_;
export const IastBuild = IastBuild_;

// const { freeze, memoize } = Helpers;

// let sPrintOutTpbs = false;

// function setPrintOutsEnabled(b: boolean): void {
//   sPrintOutTpbs = b;
// }

// export interface IastBuild {
//   build: () => IastNode | undefined,
//   errors: () => Readonly<{ message: string }>[] 
// }

// function make(mTokens: TokenRange): IastBuild {
//   const mErrors: Readonly<{ message: string }>[] = [];
//   const mBuildState = BuildState.make(mErrors);

//   const inst = freeze({
//     build: memoize((): IastNode | undefined => {
//       mBuildState.pushPart( TreePartBuild.make(mTokens) );
//       if (sPrintOutTpbs) {
//         console.log(`init ${mBuildState.asString()}`);
//       }
//       while (mBuildState.hasRemainingParts()) {
//         if (sPrintOutTpbs) {
//           console.log(mBuildState.asString());
//         }
//         const part = mBuildState.popPart();
//         const addition = part.build();
//         if (!addition) {
//           mErrors.push( part.error() );
//           return;
//         }
//         addition.pushTo(mBuildState);
//       }
//       if (sPrintOutTpbs) {
//         console.log(`on complete ${mBuildState.asString()}`);
//       }
//       return mBuildState.complete();
//     }),
//     errors: () => mErrors
//   });

//   return inst;
// }

// function buildFor(tokens: TokenRange): IastNode {
//   const inst = make(tokens);
//   const res = inst.build();
//   if (!res) {
//     raise(`Failed to build AST:\n${inst.errors()[0]?.message}`);
//   }
//   return res;
// }

// export const IastBuild = freeze({ make, buildFor, setPrintOutsEnabled });

