import { IntegerType } from './integer_type';
import { ObjectType } from './object_type';
import { WasmCodeWriter } from './wasm_compilation';

type FundementalObjectTypes = {
  string_: ObjectType,
  integer_: ObjectType,
  function_: ObjectType
}

// let a := 3
// 
// let $.a := fn (x is Optional(Integer))
//   x.map(fn (x is Integer) __store(x, k)) or __load(Integer, k)
// ~

(funTypes: FundementalObjectTypes) => {
  const { string_, integer_, function_ } = funTypes;

  function getUidFrom(objType: ObjectType, operation: string, params: Readonly<ObjectType[]>) {
    return objType.lookUp(operation)?.byParameters(params)?.uid() ?? (() => {
      throw new Error(`Did not define needed fundemental function "${operation}" on "${objType.name()}" type`);
    })();
  }

  const s = {
    [getUidFrom(integer_, ':=', [integer_])]: (cw: WasmCodeWriter) => {},
    [getUidFrom(integer_, '+' , [integer_])]: (cw: WasmCodeWriter) => {
      cw.addIntegers();
    },
    [getUidFrom(integer_, '-',  [integer_])]: (cw: WasmCodeWriter) => {
      cw.subtractIntegers();
    },
    [getUidFrom(integer_, '*',  [integer_])]: (cw: WasmCodeWriter) => {
      cw.multiplyIntegers();
    }
  };
}
