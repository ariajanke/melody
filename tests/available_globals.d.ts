declare let describe: (description: string, def: () => void) => void;
declare let fdescribe: (description: string, def: () => void) => void;
declare let it: (description: string, def: () => void) => void;
declare let fit: (description: string, def: () => void) => void;
declare let expect: any;
declare let spyOnAllFunctions: any;
declare function beforeEach(fn?: () => void, timeout?: number);
declare let jasmine: any;
declare let fail: () => void;
