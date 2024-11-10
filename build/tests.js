"use strict";
(() => {
  // tests/globals.ts
  globalThis["debug_mode"] = true;

  // src/helpers.ts
  var globalThis_ = globalThis;
  var kDebugMode = globalThis_["debug_mode"] ?? false;
  var Helpers = Object.freeze({
    expose,
    freeze: !kDebugMode ? Object.freeze : pass,
    mapValues,
    depthOneCopy,
    memoize,
    verifyInTesting,
    symbolToString: getSymbolThings().symbolToString,
    registerSymbolStrings: getSymbolThings().registerSymbolStrings
  });
  var StandardError = (() => {
    const { freeze: freeze38 } = Helpers;
    const kErrorNotSetFn = () => {
      throw new Error("No error set, this method should not be called");
    };
    function make3() {
      let mErrorFn = kErrorNotSetFn;
      let mInst = void 0;
      function setErrorFn(fn) {
        mErrorFn = fn;
      }
      function setErrorMessage(message) {
        mErrorFn = () => freeze38({ message });
      }
      function error() {
        return mErrorFn();
      }
      function hasErrorSet() {
        return mErrorFn !== kErrorNotSetFn;
      }
      const sharedErrorInstance = () => mInst ??= freeze38({
        setErrorFn,
        setErrorMessage,
        error,
        sharedErrorInstance,
        hasErrorSet
      });
      return sharedErrorInstance();
    }
    return freeze38({ make: make3 });
  })();
  expose({ Helpers });
  var TypeCheckable = (() => {
    function make3() {
      const kTypeKey = Symbol();
      function hasCreated(thing) {
        return thing?.type() === kTypeKey;
      }
      function type() {
        return kTypeKey;
      }
      return Helpers.freeze({ hasCreated, type });
    }
    return Helpers.freeze({
      make: make3
    });
  })();
  function verifyInTesting() {
    if (kDebugMode)
      return;
    throw Error("Cannot be called outside of a testing environment");
  }
  function pass(arg) {
    return arg;
  }
  function forEachKeyIn(obj, fn) {
    Object.getOwnPropertySymbols(obj).forEach(fn);
    Object.getOwnPropertyNames(obj).forEach(fn);
  }
  function mapValues(obj, fn) {
    const transformedObj = obj;
    forEachKeyIn(obj, (key) => {
      transformedObj[key] = fn(obj[key], key);
    });
    return transformedObj;
  }
  function depthOneCopy(obj) {
    const copy = {};
    forEachKeyIn(obj, (key) => {
      copy[key] = obj[key];
    });
    return copy;
  }
  function expose(braceEnclosedVar) {
    const setToWindow = (k) => {
      globalThis_[k] = braceEnclosedVar[k];
    };
    return Object.keys(braceEnclosedVar).forEach(setToWindow);
  }
  function memoize(fn) {
    let get = () => {
      const v = fn();
      get = () => v;
      return v;
    };
    return () => get();
  }
  function getSymbolThings() {
    const impl = memoize(() => {
      const mRegistry = {};
      function symbolToString(id) {
        const got = mRegistry[id];
        if (got) {
          return got;
        } else {
          return "<unregistered symbol>";
        }
      }
      function registerSymbolStrings2(topName, symbolTable) {
        Object.keys(symbolTable).forEach((v) => {
          mRegistry[symbolTable[v]] = `${topName}.${v}`;
        });
      }
      return Object.freeze({
        symbolToString,
        registerSymbolStrings: registerSymbolStrings2
      });
    });
    return memoize(impl)();
  }

  // tests/test_helpers.ts
  var { freeze } = Helpers;
  var TestHelpers = freeze({
    describeNamed,
    fdescribeNamed
  });
  function describeNamed(obj, descFn) {
    describe(Object.keys(obj)[0], descFn);
  }
  function fdescribeNamed(obj, descFn) {
    fdescribe(Object.keys(obj)[0], descFn);
  }
  var ReachPoint = (() => {
    function make3() {
      return construct([0], 0);
    }
    function construct(mSet, mIdx) {
      let mRequiredHits = 1;
      let mName = `Point ${mIdx + 1}`;
      return Object.freeze({
        hitsAtExactly: (times, name) => {
          mRequiredHits = times;
          mSet[mIdx]++;
          if (mSet[mIdx] > times) {
            throw Error(`Reached "${mName} too many times`);
          }
          if (name) {
            mName = name;
          }
        },
        verifyHit: () => {
          if (mSet[mIdx] !== mRequiredHits) {
            throw Error(`Point "${mName}" was not reached ${mRequiredHits} times`);
          }
          return true;
        }
      });
    }
    function makeCollection(size) {
      const mSet = [];
      mSet.length = size;
      mSet.fill(0);
      const mPoints = [];
      for (let i = 0; i < size; ++i) {
        mPoints.push(construct(mSet, i));
      }
      return Object.freeze({
        points: () => mPoints,
        verifyAllHit: () => {
          mPoints.forEach((pt) => {
            pt.verifyHit();
          });
          return true;
        }
      });
    }
    return Object.freeze({ make: make3, makeCollection });
  })();

  // src/function_type.ts
  var { freeze: freeze2 } = Helpers;
  var ParameterFit = freeze2({
    isLike: Symbol(),
    isType: Symbol(),
    isInterface: Symbol()
  });
  var IncompleteFunctionType = (() => {
    const reservedAnonymouseName = "<anonymous>";
    function make3() {
      const mUid = Symbol();
      const mArguments_ = [];
      const mReturns = [];
      let mBuiltin = void 0;
      let mName = reservedAnonymouseName;
      const inst = freeze2({
        arguments_,
        returns,
        uid,
        isComplete,
        setName,
        setArguments,
        setReturns,
        name,
        finish,
        setBuiltin,
        builtIn: () => mBuiltin
      });
      function arguments_() {
        return mArguments_;
      }
      function returns() {
        return mReturns;
      }
      function uid() {
        return mUid;
      }
      function isComplete() {
        return false;
      }
      function setName(name2) {
        if (name2 === reservedAnonymouseName) {
          throw Error(`Cannot name function "${name2}"`);
        }
        mName = name2;
        return inst;
      }
      function setArguments(args) {
        mArguments_.length = 0;
        mArguments_.push(...args);
        return inst;
      }
      function setReturns(rets) {
        mReturns.length = 0;
        mReturns.push(...rets);
        return inst;
      }
      function name() {
        return mName;
      }
      function finish() {
        return FunctionType.make(inst);
      }
      function setBuiltin(fn) {
        mBuiltin = fn;
        return inst;
      }
      return inst;
    }
    return freeze2({ make: make3, reservedAnonymouseName });
  })();
  var FunctionType = (() => {
    function satisfactionDegreeOfParam(lhs, rhs) {
      if (lhs.fitType === ParameterFit.isType && rhs.fitType === ParameterFit.isType && lhs.objectType === rhs.objectType) {
        return 0;
      }
    }
    function satisfactionDegreeOfReturns(lhs, rhs) {
      const length = Math.min(lhs.length, rhs.length);
      for (let i = 0; i < length; ++i) {
        if (lhs[i].uid !== rhs[i].uid) {
          return void 0;
        }
      }
      return 0;
    }
    function make3(base) {
      const { arguments_, returns, uid, name, builtIn } = base;
      const inst = freeze2({
        // 0 meaning 1-1 match
        // undefined for does not match at all
        satisfactionDegree: (fn) => {
          if (fn.arguments_().length !== arguments_().length || fn.returns().length !== returns().length) {
            return void 0;
          }
          const argDeg = inst.satisfactionDegreeOfArguments(fn.arguments_());
          if (argDeg !== 0)
            return;
          const rtDeg = satisfactionDegreeOfReturns(fn.returns(), returns());
          if (rtDeg !== 0)
            return;
          return argDeg + rtDeg;
        },
        satisfactionDegreeOfArguments: (rhs) => {
          const lhs = arguments_();
          const length = Math.min(lhs.length, rhs.length);
          let degree = 0;
          for (let i = 0; i < length; ++i) {
            const lhsP = lhs[i];
            const rhsP = rhs[i];
            const deg = satisfactionDegreeOfParam(lhsP, rhsP);
            if (deg !== 0)
              return;
            degree += deg;
          }
          return degree;
        },
        arguments_,
        returns,
        uid,
        name,
        isComplete: () => true,
        builtIn
      });
      return inst;
    }
    return freeze2({
      make: make3,
      satisfactionDegreeOfParam
    });
  })();

  // src/object_type.ts
  var { freeze: freeze3 } = Helpers;
  var ObjectType = (() => {
    const { memoize: memoize17 } = Helpers;
    const kBuiltInTypeUids = freeze3({
      integer: Symbol(),
      string: Symbol(),
      function_: Symbol()
    });
    const kUidBuiltinStrategy = freeze3({
      Integer: kBuiltInTypeUids.integer,
      String: kBuiltInTypeUids.string,
      // The *only* type of function that exist right now, is the "a block to
      // jump to" function. And that's it, for now.
      Function: kBuiltInTypeUids.function_
    });
    function makeUidFor(name) {
      return kUidBuiltinStrategy[name] ?? Symbol();
    }
    function make3(name) {
      name ??= "<anonymous>";
      let mLookupTable = {};
      const inst = freeze3({
        lookUp,
        name: () => name,
        uid: makeUidFor(name),
        setLookUp,
        asSingluarParameter: memoize17(asSingluarParameter)
      });
      function setLookUp(lookupTable) {
        mLookupTable = lookupTable;
        return inst;
      }
      function lookUp(operation) {
        return mLookupTable[operation];
      }
      function asSingluarParameter() {
        return [{
          fitType: ParameterFit.isType,
          interfaceType: void 0,
          objectType: inst.uid
        }];
      }
      return inst;
    }
    return freeze3({ make: make3, builtInTypeUids: kBuiltInTypeUids });
  })();

  // src/object_look_up_table.ts
  var { freeze: freeze4, memoize: memoize2 } = Helpers;
  var ObjectLookUpTable = (() => {
    const getBuiltinTypes = memoize2(() => {
      const integer_ = ObjectType.make("Integer");
      const string_ = ObjectType.make("String");
      const function_ = ObjectType.make("Function");
      const add = IncompleteFunctionType.make().setName("+").setArguments(integer_.asSingluarParameter()).setReturns([integer_]).setBuiltin((stack, lhs, rhs) => {
        stack.push().set(lhs.asNumber() + rhs.asNumber());
      }).finish();
      const sub = IncompleteFunctionType.make().setName("-").setArguments(integer_.asSingluarParameter()).setReturns([integer_]).setBuiltin((stack, lhs, rhs) => {
        stack.push().set(lhs.asNumber() - rhs.asNumber());
      }).finish();
      const mul = IncompleteFunctionType.make().setName("*").setArguments(integer_.asSingluarParameter()).setReturns([integer_]).setBuiltin((stack, lhs, rhs) => {
        stack.push().set(lhs.asNumber() * rhs.asNumber());
      }).finish();
      const assign = IncompleteFunctionType.make().setName(":=").setArguments(integer_.asSingluarParameter()).setReturns([integer_]).setBuiltin((stack, lhs, rhs) => {
        rhs.copyTo(lhs);
        lhs.copyTo(stack.push());
      }).finish();
      const toS = IncompleteFunctionType.make().setName("toString").setArguments([]).setReturns([string_]).finish();
      const assignStr = IncompleteFunctionType.make().setName(":=").setArguments(string_.asSingluarParameter()).setReturns([string_]).setBuiltin((stack, lhs, rhs) => {
        rhs.copyTo(lhs);
        lhs.copyTo(stack.push());
      }).finish();
      const assignFn = IncompleteFunctionType.make().setName(":=").setArguments(function_.asSingluarParameter()).setReturns([function_]).setBuiltin((stack, lhs, rhs) => {
        rhs.copyTo(lhs);
        lhs.copyTo(stack.push());
      }).finish();
      return freeze4({
        Integer: integer_.setLookUp({
          ["*"]: mul,
          ["+"]: add,
          ["-"]: sub,
          [":="]: assign,
          ["toString"]: toS
        }),
        String: string_.setLookUp({
          [":="]: assignStr
        }),
        Function: function_.setLookUp({
          [":="]: assignFn
        }),
        Unresolved: ObjectType.make("Unresolved")
      });
    });
    function make3() {
      const inst = freeze4({ addBuiltinTypes, lookUpByType });
      const mLookUpByUid = {};
      const mLookUpByName = {};
      function addBuiltinTypes() {
        [getBuiltinTypes().Integer, getBuiltinTypes().String].forEach((objType) => {
          mLookUpByName[objType.name()] = objType;
          mLookUpByUid[objType.uid] = objType;
        });
        return inst;
      }
      function lookUpByType(typeUid) {
        return mLookUpByUid[typeUid];
      }
      return inst;
    }
    return freeze4({ make: make3, getBuiltinTypes });
  })();

  // src/context_variable.ts
  var { freeze: freeze5, registerSymbolStrings } = Helpers;
  var ContextVariable = (() => {
    const cannotConvertToNumber = (_0) => {
      throw new Error("not a number");
    };
    const cannotConvertToNode = (_0) => {
      throw new Error("not a node");
    };
    const kStringAccessors = freeze5({
      asString_: (s) => s,
      asNumber: cannotConvertToNumber,
      asNode: cannotConvertToNode
    });
    const kNumericAccessors = freeze5({
      asString_: (s) => `${s}`,
      asNumber: (s) => s,
      asNode: cannotConvertToNode
    });
    const kFunctionAccessors = freeze5({
      asString_: (_0) => "<function>",
      asNumber: cannotConvertToNumber,
      asNode: (sv) => sv
    });
    const kUninitializedAccessors = (() => {
      const kNotInitializedError = (_0) => {
        throw new Error(`not initialized`);
      };
      return freeze5({
        asString_: kNotInitializedError,
        asNumber: kNotInitializedError,
        asNode: kNotInitializedError
      });
    })();
    const kTypes = freeze5({
      integer: Symbol(),
      string: Symbol(),
      function_: Symbol()
    });
    registerSymbolStrings("ContextVariable", kTypes);
    function make3(mValue) {
      const { getBuiltinTypes } = ObjectLookUpTable;
      const kBuiltinTypes = getBuiltinTypes();
      const inst = freeze5({ set, asString, asNumber, type, copyTo, setType, asNode });
      let mType = kBuiltinTypes.Unresolved;
      let mAsString = kUninitializedAccessors.asString_;
      let mAsNumber = kUninitializedAccessors.asNumber;
      let mAsNode = kUninitializedAccessors.asNode;
      function set(v) {
        const accessors = (() => {
          if (typeof v === "number") {
            mType = kBuiltinTypes.Integer;
            return kNumericAccessors;
          } else if (typeof v === "string") {
            mType = kBuiltinTypes.String;
            return kStringAccessors;
          } else if (typeof v === "object") {
            mType = kBuiltinTypes.Function;
            return kFunctionAccessors;
          } else {
            throw Error(`Cannot handle type "${typeof v}`);
          }
        })();
        mValue = v;
        mAsString = accessors.asString_;
        mAsNumber = accessors.asNumber;
        mAsNode = accessors.asNode;
        return inst;
      }
      function setType(objType) {
        switch (objType.uid) {
          case kBuiltinTypes.Integer.uid:
            mType = kBuiltinTypes.Integer;
            break;
          case kBuiltinTypes.String.uid:
            mType = kBuiltinTypes.String;
            break;
          case kBuiltinTypes.Function.uid:
            mType = kBuiltinTypes.Function;
            break;
          default:
            throw Error(`Cannot set to type "${objType.name()}"`);
        }
        return inst;
      }
      function copyTo(cv) {
        if (typeof mValue === "undefined") {
          throw Error("Cannot copy uninitialized context variable");
        }
        cv.set(mValue);
      }
      function asString() {
        return mAsString(mValue);
      }
      function asNumber() {
        return mAsNumber(mValue);
      }
      function asNode() {
        return mAsNode(mValue);
      }
      function type() {
        return mType;
      }
      return mValue ? set(mValue) : inst;
    }
    return freeze5({ make: make3, types: kTypes });
  })();

  // src/ast_node.ts
  var { freeze: freeze6 } = Helpers;
  var AstNode = (() => {
    const executionTypes = ContextVariable.types;
    let sStringTable = void 0;
    const class_4 = freeze6({
      executionTypes,
      typeToString: (type) => {
        const str = (sStringTable ??= freeze6({
          [class_4.types.binaryOperator]: "binary operator",
          [class_4.types.tuple]: "tuple",
          [class_4.types.stringLiteral]: "string literal",
          [class_4.types.identifier]: "identifier",
          [class_4.types.letDeclaration]: "declaration",
          [class_4.types.integerLiteral]: "integer literal"
        }))[type];
        if (str)
          return str;
        throw Error("given symbol is not an AstNode type");
      },
      types: {
        functionCall: Symbol(),
        tuple: Symbol(),
        stringLiteral: Symbol(),
        identifier: Symbol(),
        letDeclaration: Symbol(),
        binaryOperator: Symbol(),
        integerLiteral: Symbol(),
        functionDefinition: Symbol()
      }
    });
    return class_4;
  })();
  var AstEvaluatableNode = (() => {
    const { stringLiteral, identifier, integerLiteral } = AstNode.types;
    const _forceCastToEvaluatableNode = (node) => node;
    const _defaultCase = (_0) => void 0;
    const kDowncastTable = freeze6({
      [stringLiteral]: _forceCastToEvaluatableNode,
      [identifier]: _forceCastToEvaluatableNode,
      [integerLiteral]: _forceCastToEvaluatableNode
    });
    return freeze6({
      tryDowncast: (node) => (kDowncastTable[node.type()] ?? _defaultCase)(node)
    });
  })();

  // src/type_resolution.ts
  var { freeze: freeze7 } = Helpers;
  var TypeResolution = freeze7({
    makeFunctionResolution: (mCaller, mName, mParameters) => {
      const { setErrorMessage, error } = StandardError.make();
      return freeze7({
        resolve: () => {
          const func = mCaller.lookUp(mName);
          const deg = func.satisfactionDegreeOfArguments(mParameters);
          if (deg === 0) {
            const rets = func.returns();
            if (rets.length > 1) {
              throw Error("Tuple returns not implemented");
            }
            return func.returns()[0];
          }
          return setErrorMessage(`Could not resolve function call for "${mName}"`);
        },
        error
      });
    },
    makeFixedForType: (object) => freeze7({
      resolve: () => object,
      error: () => StandardError.make().error()
    })
  });

  // src/ast_binary_operator_node.ts
  var AstBinaryOperatorNode = (() => {
    const { freeze: freeze38 } = Helpers;
    const binaryOperatorType = AstNode.types.binaryOperator;
    return freeze38({
      make: (op, lhs, rhs) => {
        const inst = freeze38({
          operation: () => op,
          visit: (visitor) => visitor.visitBinaryOperation(inst, lhs, rhs),
          type: () => binaryOperatorType,
          executionType: (types) => {
            const lhsRes = lhs.executionType(types);
            const lhsType = lhsRes.resolve();
            if (!lhsType) {
              return lhsRes;
            }
            const rhsRes = rhs.executionType(types);
            const rhsType = rhsRes.resolve();
            if (!rhsType) {
              return rhsRes;
            }
            return TypeResolution.makeFunctionResolution(lhsType, op, rhsType.asSingluarParameter());
          },
          visitChildren: (visitor) => {
            lhs.visit(visitor);
            rhs.visit(visitor);
          },
          asString: () => `operator ${op}`
        });
        return inst;
      }
    });
  })();

  // src/tokenization/character_class.ts
  var CharacterClass = (() => {
    const { freeze: freeze38 } = Helpers;
    function safeOneCharJumpTable(charsPairs) {
      const arr = [];
      charsPairs.forEach((pair) => {
        if (pair[0])
          arr[pair[0]] = pair[1];
      });
      return arr;
    }
    const classes = freeze38({
      numeric: Symbol(),
      alphabetic: Symbol(),
      operative: Symbol(),
      spacious: Symbol(),
      newLine: Symbol(),
      literal: Symbol()
    });
    function arrayAsCharacterSetFor(arr, characterClass) {
      return arr.map((k) => [k.codePointAt(0), characterClass]);
    }
    const kCharacterToCharacterClass = [
      ...arrayAsCharacterSetFor(
        [
          "1",
          "2",
          "3",
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
          "0"
        ],
        classes.numeric
      ),
      ...arrayAsCharacterSetFor(
        [
          "=",
          ":",
          ",",
          ".",
          "(",
          ")",
          "{",
          "}",
          "*",
          "+",
          "*"
        ],
        classes.operative
      ),
      ...arrayAsCharacterSetFor(
        [
          " ",
          "	",
          "\r"
        ],
        classes.spacious
      ),
      ...arrayAsCharacterSetFor(
        [
          "'"
        ],
        classes.literal
      ),
      ...arrayAsCharacterSetFor(["\n"], classes.newLine)
    ];
    const jumpToClass = safeOneCharJumpTable(kCharacterToCharacterClass);
    return freeze38({
      classes,
      classOfString: (character) => {
        if (character.length !== 1) {
          throw Error(`"${character}" is not one character`);
        } else if (typeof character !== "string") {
          throw Error(`must provide string only`);
        }
        return jumpToClass[character.codePointAt(0)] ?? classes.alphabetic;
      },
      classOfNonKeyword: (tokenContent) => CharacterClass.classOfString(tokenContent[0])
    });
  })();
  Helpers.expose({ CharacterClass });

  // src/tokenization/crawl_strategies.ts
  var CrawlStrategies = (() => {
    const { freeze: freeze38 } = Object;
    const { classes, classOfString } = CharacterClass;
    function crawlAlphanumeric(input, start) {
      const { length } = input;
      for (let i = start + 1; i < length; ++i) {
        switch (classOfString(input[i])) {
          case classes.operative:
          case classes.spacious:
          case classes.literal:
          case classes.newLine:
            return i;
          default:
            break;
        }
      }
      return length;
    }
    function crawlStringLiteral(input, start) {
      const { length } = input;
      for (let i = start + 1; i < length; ++i) {
        if (classOfString(input[i]) === classes.literal) {
          return i + 1;
        }
      }
      return length;
    }
    function crawlOperator(input, start) {
      if (start + 1 >= input.length) {
        return start + 1;
      } else if (input[start + 1] === "=" && input[start] !== "=") {
        return start + 2;
      }
      return start + 1;
    }
    function crawlSpace(input, start) {
      const { length } = input;
      for (let i = start + 1; i < length; ++i) {
        switch (classOfString(input[i])) {
          case classes.alphabetic:
          case classes.numeric:
          case classes.operative:
          case classes.literal:
          case classes.newLine:
            return i;
          default:
            break;
        }
      }
      return length;
    }
    function crawlNewLines(input, start) {
      const { length } = input;
      for (let i = start + 1; i < length; ++i) {
        if (classOfString(input[i]) !== classes.newLine) {
          return i;
        }
      }
      return length;
    }
    function crawlNumeric(input, start) {
      const { length } = input;
      for (let i = start + 1; i < length; ++i) {
        if (classOfString(input[i]) !== classes.numeric) {
          return i;
        }
      }
      return length;
    }
    return freeze38({
      [classes.alphabetic]: crawlAlphanumeric,
      [classes.literal]: crawlStringLiteral,
      [classes.operative]: crawlOperator,
      [classes.numeric]: crawlNumeric,
      [classes.spacious]: crawlSpace,
      [classes.newLine]: crawlNewLines
    });
  })();

  // src/tokenization/character_crawler.ts
  var CharacterCrawler = (() => {
    const { freeze: freeze38 } = Object;
    const injections2 = freeze38({
      CrawlStrategies,
      characterClassOf: CharacterClass.classOfString,
      characterClasses: CharacterClass.classes
    });
    function make3(mInput, { CrawlStrategies: CrawlStrategies2, characterClassOf, characterClasses } = injections2) {
      const inst = freeze38({ reachedEnd, readToken, crawl });
      let mStart = 0;
      let mEnd = 0;
      let mReadToken = Token.kBlankToken;
      function readToken() {
        return mReadToken;
      }
      function reachedEnd() {
        return mEnd === mInput.length;
      }
      function crawledThrough() {
        if (mStart >= mInput.length) {
          throw Error("Cannot crawl at end of string");
        }
        const charClass = characterClassOf(mInput[mEnd]);
        if (mReadToken.content() !== "" && charClass !== characterClasses.spacious) {
          return;
        }
        const crawlFn = CrawlStrategies2[charClass];
        const next = crawlFn(mInput, mEnd);
        if (next <= mEnd) {
          throw Error("progression failed");
        }
        mEnd = next;
        if (charClass !== characterClasses.spacious) {
          mReadToken = Token.make(mInput, mStart, mEnd);
        }
        mStart = mEnd;
        return;
      }
      function crawl() {
        mReadToken = Token.kBlankToken;
        while (mReadToken.content() === "") {
          crawledThrough();
        }
        if (mStart < mInput.length) {
          crawledThrough();
        }
        return inst;
      }
      return inst;
    }
    return freeze38({ make: make3 });
  })();

  // src/token_range.ts
  var { freeze: freeze8, verifyInTesting: verifyInTesting2 } = Helpers;
  var TokenRange = (() => {
    function makeStartingRange(mTokens) {
      return make3(mTokens, 0, mTokens.length);
    }
    function forEachIn(tokenRange, fn) {
      const { start, end } = tokenRange;
      const rangeEnd = end();
      for (let i = start(); i < rangeEnd; ++i) {
        fn(tokenRange.tokenAt(i).content());
      }
    }
    function make3(mTokens, mStart, mEnd) {
      const kNewLineType = Token.types.newLine;
      const inst = freeze8({
        step: () => {
          ++mStart;
          return _verifyValidRange();
        },
        skipNewLine: () => {
          if (inst.isEmpty() || mTokens[mStart].type() !== kNewLineType) {
            return inst;
          }
          return inst.step();
        },
        clone: (start, end) => make3(mTokens, start ?? mStart, end ?? mEnd),
        tokenAt: (i) => mTokens[i],
        start: () => mStart,
        end: () => mEnd,
        isEmpty: () => mStart === mEnd,
        startToken: () => mTokens[mStart],
        range: () => {
          verifyInTesting2();
          return freeze8({ start: mStart, end: mEnd });
        },
        asString: () => {
          let s = "";
          for (let i = mStart; i < mEnd; ++i) {
            s = `${s}, ${mTokens[i].content().replace("\n", "\\n")}`;
          }
          return s;
        }
      });
      function _verifyValidRange() {
        const { length } = mTokens;
        if (mStart > mEnd) {
          throw new Error(`Range start ${mStart} must be less than or equal to end ${mEnd}`);
        } else if (length < mEnd) {
          throw new Error(`Range end ${mEnd} cannot exceed token count ${length}`);
        }
        return inst;
      }
      return _verifyValidRange();
    }
    return freeze8({ make: make3, makeStartingRange, forEachIn });
  })();

  // src/tokenization.ts
  var Tokenization = (() => {
    const { freeze: freeze38 } = Helpers;
    const injections2 = freeze38({ CharacterCrawler, TokenRange });
    const getCharacterClassToTokenTypeMap = /* @__PURE__ */ (() => {
      function makeCharacterClassToTokenTypeMap() {
        const { classes } = CharacterClass;
        const { types } = Token;
        return freeze38({
          [classes.numeric]: () => types.integerLiteral,
          [classes.literal]: () => types.stringLiteral,
          [classes.spacious]: () => {
            throw Error(`May not use whitespace as a token`);
          },
          [classes.newLine]: () => types.newLine
        });
      }
      let sMap = void 0;
      return () => sMap ??= makeCharacterClassToTokenTypeMap();
    })();
    return freeze38({
      make: ({ CharacterCrawler: CharacterCrawler2, TokenRange: TokenRange2 } = injections2) => freeze38({
        tokenize: (inp) => {
          const rv = [];
          const crawler = CharacterCrawler2.make(inp);
          while (!crawler.reachedEnd()) {
            const readToken = crawler.crawl().readToken();
            rv.push(readToken);
          }
          return TokenRange2.makeStartingRange(rv);
        }
      }),
      tokenTypeOfNonKeyword: (tokenContent, charClassClass = CharacterClass) => {
        const charClass = charClassClass.classOfNonKeyword(tokenContent);
        const getter = getCharacterClassToTokenTypeMap()[charClass] ?? (() => Token.types.identifier);
        return getter();
      }
    });
  })();

  // src/token.ts
  var { freeze: freeze9 } = Object;
  var Token = (() => {
    const types = freeze9({
      functionDefinition: Symbol(),
      operator: Symbol(),
      newLine: Symbol(),
      grouping: Symbol(),
      identifier: Symbol(),
      stringLiteral: Symbol(),
      integerLiteral: Symbol()
    });
    function makeSpecialToken(content_) {
      function unimplemented(desc) {
        return () => {
          throw Error(`Cannot call ${desc} unimplemented`);
        };
      }
      return freeze9({
        type: unimplemented("type"),
        // TODO: try to get rid of this hack, blank token should
        // never be used
        content: () => content_,
        start: unimplemented("start"),
        end: unimplemented("end")
      });
    }
    ;
    const kBlankToken = makeSpecialToken("");
    const kCallToken = makeSpecialToken("call");
    const tokenTypeOf = (() => {
      const kControlSeqs = freeze9({
        ["let"]: types.operator,
        ["fn"]: types.functionDefinition,
        ["("]: types.grouping,
        [")"]: types.grouping,
        [","]: types.operator,
        ["+"]: types.operator,
        ["-"]: types.operator,
        ["*"]: types.operator,
        [":="]: types.operator,
        ["="]: types.operator
      });
      return (tokenContent, tokenizationClass = Tokenization) => kControlSeqs[tokenContent] ?? tokenizationClass.tokenTypeOfNonKeyword(tokenContent);
    })();
    function makeFromStringOnly(mContents) {
      return construct(mContents, 0, 0);
    }
    function construct(mTokenContent, mStart, mEnd) {
      let mType = void 0;
      return freeze9({
        content: () => mTokenContent,
        start: () => mStart,
        end: () => mEnd,
        type: () => mType ??= tokenTypeOf(mTokenContent)
      });
    }
    return freeze9({
      make: (mInput, mStart, mEnd) => construct(mInput.substring(mStart, mEnd), mStart, mEnd),
      types,
      kBlankToken,
      kCallToken,
      forTesting: { makeFromStringOnly }
    });
  })();

  // src/operator_definitions.ts
  var { freeze: freeze10 } = Helpers;
  var makeListingFunction = (operandRelation) => {
    let sListing;
    return () => {
      if (sListing) {
        return sListing;
      }
      const listingArray = OperatorDefinitions.fullListing().reduce((prev, def) => {
        if (def.operandRelation === operandRelation) {
          return [...prev, def];
        }
        return prev;
      }, []).map((def) => ({ [def.representation]: def }));
      return sListing = Object.assign({}, ...listingArray);
    };
  };
  var operandRelationships = freeze10({
    binary: "binary",
    unary: "unary",
    fringe: "fringe"
  });
  var OperatorDefinitions = freeze10({
    fullListing: /* @__PURE__ */ (() => {
      const counter = /* @__PURE__ */ (() => {
        let m = 0;
        return () => m++;
      })();
      let sFullListing;
      return () => {
        if (sFullListing)
          return sFullListing;
        const { binary, unary } = OperatorDefinitions.operandRelationships;
        const call = Token.kCallToken.content();
        return sFullListing = // listed in increasing precedence order
        [
          { representation: "let", operandRelation: unary },
          { representation: ",", operandRelation: binary },
          { representation: "=", operandRelation: binary },
          { representation: ":=", operandRelation: binary },
          { representation: "+", operandRelation: binary },
          { representation: "-", operandRelation: binary },
          { representation: "*", operandRelation: binary },
          { representation: "-", operandRelation: unary },
          { representation: "/", operandRelation: binary },
          { representation: "not", operandRelation: unary },
          { representation: "and", operandRelation: binary },
          { representation: "or", operandRelation: binary },
          { representation: call, operandRelation: binary },
          { representation: ".", operandRelation: binary }
        ].map(({ representation, operandRelation }) => ({ representation, precedence: counter(), operandRelation }));
      };
    })(),
    isAnOperator: /* @__PURE__ */ (() => {
      let sRepresentations;
      const fn = (str) => {
        if (sRepresentations)
          return !!sRepresentations[str];
        const repArray = OperatorDefinitions.fullListing().map((def) => ({ [def.representation]: true }));
        sRepresentations = Object.assign({}, ...repArray);
        return fn(str);
      };
      return fn;
    })(),
    unaryListing: makeListingFunction(operandRelationships.unary),
    binaryListing: makeListingFunction(operandRelationships.binary),
    operandRelationships
  });

  // src/ast_identifier_node.ts
  var { freeze: freeze11 } = Helpers;
  var AstIdentifierNode = (() => {
    const kIndentifier = AstNode.types.identifier;
    const { isAnOperator } = OperatorDefinitions;
    function make3(value) {
      const inst = freeze11({
        comesBeforeOperator: (operator) => isAnOperator(operator.content()),
        executionType: (types) => types.lookUpIdentifierType(value),
        evaluate: (getter) => getter(value),
        type: () => kIndentifier,
        asString: () => value,
        visit: (visitor) => visitor.visitIdentifier(inst)
      });
      return inst;
    }
    return freeze11({ make: make3 });
  })();

  // src/ast_node_visitor.ts
  var { freeze: freeze12 } = Helpers;
  var AstNodeVisitorBuilder = (() => {
    function makeContinuingImplementations() {
      let mCurrentInst = freeze12({
        visitBinaryOperation: (_0, lhs, rhs) => {
          lhs.visit(mCurrentInst);
          rhs.visit(mCurrentInst);
        },
        visitFunctionCall: (node) => {
          node.arguments.forEach((node2) => node2.visit(mCurrentInst));
        },
        visitLetDeclaration: (_0, rhs) => {
          rhs.visit(mCurrentInst);
        },
        visitIdentifier: (_0) => {
        },
        visitTuple: (tuple) => {
          tuple.forEach((node) => node.visit(mCurrentInst));
        },
        visitFunctionDefinition: (_0, nodes) => {
          nodes.forEach((node) => node.visit(mCurrentInst));
        },
        setInstanceReference: (inst) => {
          mCurrentInst = inst;
          return inst;
        }
      });
      return mCurrentInst;
    }
    const kStoppingImplementations = (() => {
      const inst = freeze12({
        visitBinaryOperation: (_0, _1, _2) => {
        },
        visitFunctionCall: (_0) => {
        },
        visitLetDeclaration: (_0, _1) => {
        },
        visitIdentifier: (_0) => {
        },
        visitTuple: (_0) => {
        },
        visitFunctionDefinition: (_0, _1) => {
        },
        setInstanceReference: (passedInst) => passedInst
      });
      return inst;
    })();
    const class_4 = freeze12({
      makeDefaultingToStop: () => class_4.make(kStoppingImplementations),
      makeDefaultingToContinue: () => class_4.make(makeContinuingImplementations()),
      make: (mImplementations) => {
        let mVisitBinaryOperation = mImplementations.visitBinaryOperation;
        let mVisitFunctionCall = mImplementations.visitFunctionCall;
        let mVisitLetDeclaration = mImplementations.visitLetDeclaration;
        let mVisitIdentifier = mImplementations.visitIdentifier;
        let mVisitTuple = mImplementations.visitTuple;
        let mVisitFunctionDefinition = mImplementations.visitFunctionDefinition;
        const inst = freeze12({
          visitBinaryOperation: (fn) => {
            mVisitBinaryOperation = fn;
            return inst;
          },
          visitFunctionCall: (fn) => {
            mVisitFunctionCall = fn;
            return inst;
          },
          visitLetDeclaration: (fn) => {
            mVisitLetDeclaration = fn;
            return inst;
          },
          visitIdentifier: (fn) => {
            mVisitIdentifier = fn;
            return inst;
          },
          visitTuple: (fn) => {
            mVisitTuple = fn;
            return inst;
          },
          visitFunctionDefinition: (fn) => {
            mVisitFunctionDefinition = fn;
            return inst;
          },
          finish: () => {
            const inst2 = freeze12({
              visitBinaryOperation: mVisitBinaryOperation,
              visitFunctionCall: mVisitFunctionCall,
              visitLetDeclaration: mVisitLetDeclaration,
              visitIdentifier: mVisitIdentifier,
              visitTuple: mVisitTuple,
              visitFunctionDefinition: mVisitFunctionDefinition
            });
            return mImplementations.setInstanceReference(inst2);
          }
        });
        return inst;
      }
    });
    return class_4;
  })();

  // tests/ast_binary_operator_node_tests.ts
  var { describeNamed: describeNamed2 } = TestHelpers;
  describeNamed2({ AstBinaryOperatorNode }, () => {
    const { make: make3 } = AstBinaryOperatorNode;
    const makeIdentifier = AstIdentifierNode.make;
    it("is reachable by visitor", () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitBinaryOperation((_0, _1, _2) => {
        hitsAtExactly(1);
      }).finish();
      make3(":=", makeIdentifier(""), makeIdentifier("")).visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });
    it("reports self as a binary operator node type", () => {
      const type = make3(":=", makeIdentifier(""), makeIdentifier("")).type();
      expect(type).toEqual(AstNode.types.binaryOperator);
    });
    it("maybe visited for assigee name", () => {
      let assigneeName = "";
      const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitBinaryOperation((_0, node, _1) => {
        AstEvaluatableNode.tryDowncast(node)?.evaluate((name) => {
          assigneeName = name;
          return ContextVariable.make();
        });
      }).finish();
      make3(":=", makeIdentifier("foo"), makeIdentifier("")).visit(visitor);
      expect(assigneeName).toEqual("foo");
    });
    describe("#executionType", () => {
      it("deduces return type correctly", () => {
        const sampleObjectType = ObjectType.make();
        const sampleReturnType = ObjectType.make();
        const funcType = IncompleteFunctionType.make().setName("foo").setArguments([{ fitType: ParameterFit.isType, interfaceType: void 0, objectType: sampleObjectType.uid }]).setReturns([sampleReturnType]).finish();
        sampleObjectType.setLookUp({
          ["foo"]: funcType
        });
        const a = {
          lookUpIdentifierType: (_0) => {
            return TypeResolution.makeFixedForType(sampleObjectType);
          },
          lookUpIntegerLiteralType: () => TypeResolution.makeFixedForType(ObjectLookUpTable.getBuiltinTypes().Integer),
          lookUpStringLiteralType: () => TypeResolution.makeFixedForType(ObjectLookUpTable.getBuiltinTypes().String)
        };
        const node = make3("foo", makeIdentifier(""), makeIdentifier(""));
        const exres = node.executionType(a);
        const extype = exres.resolve();
        expect(extype?.uid).toEqual(sampleReturnType.uid);
      });
    });
  });

  // src/ast_integer_literal_node.ts
  var { freeze: freeze13, memoize: memoize3 } = Helpers;
  var AstIntegerLiteralNode = (() => {
    const kIntType = AstNode.types.integerLiteral;
    function valueOf(node) {
      if (node.type() !== kIntType) {
        throw Error("Node is not an integer literal");
      }
      return node.value();
    }
    function make3(value) {
      return construct(Number.parseInt(value));
    }
    function construct(mValue) {
      const eval_ = memoize3(() => ContextVariable.make(mValue));
      return freeze13({
        visit: (_0) => {
        },
        type: () => kIntType,
        executionType: (types) => types.lookUpIntegerLiteralType(),
        evaluate: (_0) => eval_(),
        asString: () => `${mValue}`,
        comesBeforeOperator: (operator) => {
          switch (operator.content()) {
            case ",":
            case "+":
            case "-":
            case "*":
              return true;
            default:
              return false;
          }
        },
        value: () => mValue
      });
    }
    return freeze13({ make: make3, valueOf });
  })();

  // src/ast_string_literal_node.ts
  var { freeze: freeze14, memoize: memoize4 } = Helpers;
  var AstStringLiteralNode = (() => {
    const kStringLiteral = AstNode.types.stringLiteral;
    function make3(mValue) {
      mValue = (() => {
        if (mValue.length <= 2) {
          throw Error("not a valid string");
        }
        return mValue.substring(1, mValue.length - 1);
      })();
      const mGetAsContextVar = memoize4(() => ContextVariable.make(mValue));
      return freeze14({
        comesBeforeOperator: (operator) => operator.content() === ",",
        executionType: (types) => types.lookUpStringLiteralType(),
        evaluate: (_0) => mGetAsContextVar(),
        type: () => kStringLiteral,
        asString: () => mValue,
        visit: (_0) => {
        }
      });
    }
    return freeze14({ make: make3 });
  })();

  // src/ast_fringe_node.ts
  var { freeze: freeze15 } = Helpers;
  var AstFringeNode = (() => {
    const tokenTypes = Token.types;
    const nodeTypes = AstNode.types;
    function _downcast(node) {
      switch (node.type()) {
        case nodeTypes.identifier:
        case nodeTypes.stringLiteral:
          return node;
        default:
          break;
      }
      return void 0;
    }
    function downcast(node) {
      return _downcast(node) ?? (() => {
        throw Error("AstNode is not a AstStringableNode");
      })();
    }
    function hasCreated(node) {
      return !!_downcast(node);
    }
    function makeForToken(token) {
      return (() => {
        switch (token.type()) {
          case tokenTypes.identifier:
            return AstIdentifierNode;
          case tokenTypes.stringLiteral:
            return AstStringLiteralNode;
          case tokenTypes.integerLiteral:
            return AstIntegerLiteralNode;
          default:
            throw Error("cannot build stringable node from token");
        }
      })().make(token.content());
    }
    return freeze15({ downcast, hasCreated, makeForToken });
  })();

  // src/ast_build/close_position_retrieval.ts
  var { freeze: freeze16, memoize: memoize5 } = Helpers;
  var ClosePositionRetrieval = freeze16({
    make: (mTokenRange, mGroupOpen) => {
      const { error, setErrorMessage } = StandardError.make();
      const { tokenAt, start, end } = mTokenRange;
      const fromUntil = (idx, end2) => {
        let openings = 1;
        for (; idx < end2; ++idx) {
          const tok = tokenAt(idx).content();
          if (tok === "(") {
            ++openings;
          } else if (tok === ")") {
            --openings;
            if (openings < 1) {
              return idx;
            }
          }
        }
      };
      return freeze16({
        closePosition: memoize5(() => fromUntil(start(), end()) ?? setErrorMessage(
          `Cannot find close position for ${mGroupOpen.content()}`
        )),
        error
      });
    }
  });

  // src/ast_build/start_group_build.ts
  var { freeze: freeze17, memoize: memoize6 } = Helpers;
  var CloseGroupPart = freeze17({
    make: (mTokenRange) => freeze17({
      build: () => BuildStateAddition.make((sink) => {
        sink.popStatement((node) => {
          if (mTokenRange.isEmpty()) {
            return node;
          }
          sink.pushPart(ContinuingAfterSingleValueBuild.make(mTokenRange, node));
          return void 0;
        });
      }),
      error: () => {
        throw new Error("should not ever fail");
      },
      range: mTokenRange.range,
      asString: () => `CGP ${mTokenRange.asString()}`
    })
  });
  var passBuildSink = (sink) => sink;
  var GroupBuildSplit = freeze17({
    make: (mClosePosition, mTokenRange, mOnNewGroupingFn = passBuildSink) => {
      const { start, end, clone } = mTokenRange;
      const leftPartRange = () => clone(start(), mClosePosition);
      const rightPartStart = () => Math.min(mClosePosition + 1, end());
      const rightPartRange = () => clone(rightPartStart(), end());
      return freeze17({
        build: memoize6(() => {
          const leftPart = TreePartBuild.make(leftPartRange());
          const rightPart = CloseGroupPart.make(rightPartRange());
          return BuildStateAddition.make((sink) => {
            mOnNewGroupingFn(sink.pushStatement()).pushPart(rightPart).pushPart(leftPart);
          });
        })
      });
    }
  });
  var StartGroupBuild = freeze17({
    passBuildSink,
    // assumption: token range starts one after the group open token
    make: (mTokenRange, mGroupOpen, mOnNewGroupingFn = passBuildSink) => {
      if (mGroupOpen.type() !== Token.types.grouping) {
        throw Error(`Group opening must be a grouping tag.`);
      }
      const {
        error,
        closePosition
      } = ClosePositionRetrieval.make(mTokenRange.clone(), mGroupOpen);
      return freeze17({
        build: () => {
          return closePosition() && GroupBuildSplit.make(closePosition(), mTokenRange, mOnNewGroupingFn).build();
        },
        error,
        range: mTokenRange.range,
        asString: () => `SGB ${mTokenRange.asString()}`
      });
    }
  });

  // src/ast_build/continuing_after_single_value_build.ts
  var { freeze: freeze18 } = Helpers;
  var kTokenTypes = Token.types;
  var ContinuingAfterSingleValueBuild = freeze18({
    make: (mTokenRange, mCompleteNode) => {
      const { error, setErrorMessage } = StandardError.make();
      const { startToken } = mTokenRange;
      const handleFringeNext = () => setErrorMessage(`Post operator two consecutive fringe nodes not allowed`);
      const handleGrouping = () => {
        const start = startToken();
        const tpb = StartGroupBuild.make(mTokenRange.step(), start);
        return BuildStateAddition.make((sink) => {
          sink.pushNode(mCompleteNode).pushToken(Token.kCallToken, "binary").pushPart(tpb);
        });
      };
      const handleOperator = () => {
        const evStartToken = startToken();
        const nextRange = mTokenRange.step();
        const nextPart = ContinuingAfterOperatorBuild.make(nextRange, evStartToken, "binary");
        return BuildStateAddition.make((sink) => {
          sink.pushNode(mCompleteNode).pushPart(nextPart);
        });
      };
      const kNextTokenStrategies = freeze18({
        [kTokenTypes.identifier]: handleFringeNext,
        [kTokenTypes.stringLiteral]: handleFringeNext,
        [kTokenTypes.integerLiteral]: handleFringeNext,
        [kTokenTypes.grouping]: handleGrouping,
        [kTokenTypes.operator]: handleOperator,
        [kTokenTypes.newLine]: () => {
          return BuildStateAddition.make((sink) => {
            sink.pushNode(mCompleteNode).pushNewLine();
            if (!mTokenRange.skipNewLine().isEmpty()) {
              sink.pushPart(TreePartBuild.make(mTokenRange));
            }
          });
        }
      });
      const inst = freeze18({
        build: () => {
          if (mTokenRange.isEmpty()) {
            return BuildStateAddition.make((sink) => {
              sink.pushNode(mCompleteNode);
            });
          }
          const byType = startToken().type();
          return kNextTokenStrategies[byType]();
        },
        error,
        range: mTokenRange.range,
        asString: () => `CASV ${mTokenRange.asString()}`
      });
      return inst;
    }
  });

  // src/ast_build/fn_close_position_retrieval.ts
  var { freeze: freeze19, memoize: memoize7 } = Helpers;
  var class_ = freeze19({
    closePositionOf: (mTokenRange, mGroupOpen) => class_.make(mTokenRange, mGroupOpen).closePosition(),
    make: (mTokenRange, mGroupOpen) => {
      if (mGroupOpen.content() !== "fn") {
        throw new Error(`Cannot use "${mGroupOpen.content()}" to open function body`);
      }
      const { start, end, tokenAt } = mTokenRange;
      const preNewLineNonFn = () => {
        const end_ = newLineAt() ?? end();
        for (let i = start(); i < end_; ++i) {
          if (tokenAt(i).content() !== "fn") {
            return i;
          }
        }
        return void 0;
      };
      const newLineAt = memoize7(() => {
        for (let i = start(); i < end(); ++i) {
          if (tokenAt(i).type() === Token.types.newLine) {
            return i;
          }
        }
        return void 0;
      });
      const fallbackClosePosition = () => {
        const beg = newLineAt();
        if (!beg) {
          return void 0;
        }
        for (let i = beg; i < end(); ++i) {
          if (tokenAt(i).content() === "~")
            return i;
        }
        return void 0;
      };
      const knownClosePosition = () => preNewLineNonFn() ? newLineAt() : fallbackClosePosition();
      return freeze19({
        closePosition: memoize7(() => knownClosePosition() ?? end())
      });
    }
  });
  var FnClosePositionRetrieval = class_;

  // src/ast_build/start_function_definition_build.ts
  var { freeze: freeze20, memoize: memoize8 } = Helpers;
  var CloseFunctionDefinitionBuild = freeze20({
    make: (mTokenRange) => {
      return freeze20({
        build: () => {
          return BuildStateAddition.make((sink) => {
            sink.popBlock((node) => {
              sink.pushPart(ContinuingAfterSingleValueBuild.make(mTokenRange, node));
              return void 0;
            });
          });
        },
        error: StandardError.make().error,
        range: mTokenRange.range,
        asString: () => `CFnD ${mTokenRange.asString()}`
      });
    }
  });
  var StartFunctionDefinitionBuild = freeze20({
    make: (mTokenRange, mFnToken) => {
      const { closePosition } = FnClosePositionRetrieval.make(mTokenRange, mFnToken);
      const { start, end, clone } = mTokenRange;
      const inBlockRange = () => clone(start(), closePosition());
      const afterBlockRange = () => clone(closePosition() + 1, end());
      return freeze20({
        build: memoize8(() => {
          const afterPart = CloseFunctionDefinitionBuild.make(afterBlockRange());
          const inBlockPart = TreePartBuild.make(inBlockRange());
          return BuildStateAddition.make((sink) => {
            sink.pushBlock().pushPart(afterPart).pushPart(inBlockPart);
          });
        }),
        error: StandardError.make().error,
        range: mTokenRange.range,
        asString: () => `SFnD ${mTokenRange.asString()}`
      });
    }
  });

  // src/ast_build/continuing_after_operator_build.ts
  var ContinuingAfterOperatorBuild = (() => {
    const { freeze: freeze38 } = Helpers;
    const kTokenTypes2 = Token.types;
    return freeze38({
      make: (mTokenRange, mPrevOperatorToken, mOperandRelation) => {
        const { error, setErrorMessage } = StandardError.make();
        const { startToken } = mTokenRange;
        const handlePeekAheadFringe = () => {
          const start = startToken();
          const nextPart = ContinuingAfterSingleValueBuild.make(mTokenRange.step(), AstFringeNode.makeForToken(start));
          return BuildStateAddition.make((sink) => {
            sink.pushToken(mPrevOperatorToken, mOperandRelation).pushPart(nextPart);
          });
        };
        const kPeakAheadStrategies = freeze38({
          [kTokenTypes2.identifier]: handlePeekAheadFringe,
          [kTokenTypes2.integerLiteral]: handlePeekAheadFringe,
          [kTokenTypes2.stringLiteral]: handlePeekAheadFringe,
          [kTokenTypes2.newLine]: () => {
            mTokenRange.skipNewLine();
            return BuildStateAddition.make((sink) => sink.pushNewLine().pushPart(inst));
          },
          [kTokenTypes2.grouping]: () => {
            const start_ = startToken();
            mTokenRange.step();
            if (mTokenRange.isEmpty()) {
              return setErrorMessage("unexpected end after operator starting grouping");
            }
            const tpb = StartGroupBuild.make(mTokenRange, start_);
            return BuildStateAddition.make((sink) => {
              sink.pushToken(mPrevOperatorToken, mOperandRelation).pushPart(tpb);
            });
          },
          [kTokenTypes2.operator]: () => {
            const start = startToken();
            const tpb = ContinuingAfterOperatorBuild.make(mTokenRange.step(), start, "unary");
            return BuildStateAddition.make((sink) => {
              sink.pushToken(mPrevOperatorToken, mOperandRelation).pushPart(tpb);
            });
          },
          [kTokenTypes2.functionDefinition]: () => {
            const start = startToken();
            const nextPart = StartFunctionDefinitionBuild.make(mTokenRange.step(), start);
            return BuildStateAddition.make((sink) => {
              sink.pushToken(mPrevOperatorToken, mOperandRelation).pushPart(nextPart);
            });
          }
        });
        const inst = freeze38({
          error,
          build: () => {
            if (mTokenRange.isEmpty()) {
              return setErrorMessage("unexpected end of input");
            }
            const type = startToken().type();
            return kPeakAheadStrategies[type]();
          },
          range: mTokenRange.range,
          asString: () => `CAO ${mTokenRange.asString()}`
        });
        return inst;
      }
    });
  })();

  // src/ast_build/start_fringe_build.ts
  var { freeze: freeze21 } = Helpers;
  var StartFringeBuild = freeze21({
    make: (mFringeToken, mTokenRange) => {
      const { error, setErrorFn } = StandardError.make();
      function fringeNode() {
        return AstFringeNode.makeForToken(mFringeToken);
      }
      function buildFringeWithRangeAsNewPart() {
        return BuildStateAddition.make((sink) => {
          sink.pushNode(fringeNode());
          if (!mTokenRange.isEmpty()) {
            sink.pushPart(TreePartBuild.make(mTokenRange));
          }
        });
      }
      return freeze21({
        build: () => {
          if (mTokenRange.isEmpty()) {
            return buildFringeWithRangeAsNewPart();
          }
          const node = AstFringeNode.makeForToken(mFringeToken);
          const { build, error: error2 } = ContinuingAfterSingleValueBuild.make(mTokenRange, node);
          return build() ?? setErrorFn(error2);
        },
        error,
        range: mTokenRange.range,
        asString: () => `SF ${mTokenRange.asString()}`
      });
    }
  });

  // src/ast_tuple_node.ts
  var AstTupleNode = (() => {
    const { freeze: freeze38, memoize: memoize17 } = Helpers;
    const tupleType = AstNode.types.tuple;
    function makeWithPair(sep, lhs, rhs) {
      const mSubExpressions = [lhs];
      const inst = class_4.make(sep, mSubExpressions);
      if (rhs && inst.consume(rhs)) {
        mSubExpressions.push(rhs);
      }
      return inst;
    }
    const class_4 = freeze38({
      makeEmpty: () => memoize17(() => class_4.make(",", []))(),
      makeBinary: (seperator, lhs, rhs) => makeWithPair(seperator, lhs, rhs),
      make: (mSeperator, mSubExpressions) => {
        if (mSubExpressions.length === 1 && mSubExpressions[0].type() === tupleType) {
          return mSubExpressions[0];
        }
        const inst = freeze38({
          forEach: (fn) => mSubExpressions.forEach((node) => fn(node)),
          count: () => mSubExpressions.length,
          visit: (visitor) => visitor.visitTuple(inst),
          append: (node) => {
            mSubExpressions.push(node);
          },
          type: () => tupleType,
          consume: (node) => {
            if (node.type() !== tupleType) {
              return node;
            }
            const asTuple = node;
            if (!asTuple.seperatorEquals(mSeperator)) {
              return node;
            }
            asTuple.forEach((subNode) => {
              mSubExpressions.push(subNode);
            });
            return void 0;
          },
          seperatorEquals: (other) => mSeperator === other,
          executionType: (_0) => {
            throw Error(`AstTupleNode does not implement executionType`);
          },
          asString: () => `(...${mSubExpressions.length} items)`
        });
        return inst;
      }
    });
    return class_4;
  })();

  // src/ast_build/tree_part_build.ts
  var { freeze: freeze22 } = Helpers;
  var BuildStateAddition = (() => {
    const sNonAdditionInst = freeze22({ pushTo: (_0) => {
    } });
    return freeze22({
      make: (pushTo) => freeze22({ pushTo }),
      makeNonAddition: () => sNonAdditionInst
    });
  })();
  var TreePartBuild = (() => {
    const kTokenTypes2 = Token.types;
    function make3(mTokenRange) {
      const { error, setErrorFn } = StandardError.make();
      const { startToken } = mTokenRange;
      function switchToFringe() {
        const start = startToken();
        const { build, error: error2 } = StartFringeBuild.make(start, mTokenRange.step());
        return build() ?? setErrorFn(error2);
      }
      const kStartingTokenTypeToBuildAddition = freeze22({
        [kTokenTypes2.identifier]: switchToFringe,
        [kTokenTypes2.stringLiteral]: switchToFringe,
        [kTokenTypes2.integerLiteral]: switchToFringe,
        [kTokenTypes2.grouping]: () => {
          const start = startToken();
          const { build, error: error2 } = StartGroupBuild.make(mTokenRange.step(), start);
          return build() ?? setErrorFn(error2);
        },
        [kTokenTypes2.operator]: () => {
          const start = startToken();
          const part = ContinuingAfterOperatorBuild.make(mTokenRange.step(), start, "unary");
          const { build, error: error2 } = part;
          return build() ?? setErrorFn(error2);
        },
        [kTokenTypes2.newLine]: () => {
          mTokenRange.skipNewLine();
          return BuildStateAddition.make((sink) => {
            sink.pushNewLine().pushPart(inst);
          });
        },
        [kTokenTypes2.functionDefinition]: () => {
          const start = startToken();
          const { build, error: error2 } = StartFunctionDefinitionBuild.make(mTokenRange.step(), start);
          return build() ?? setErrorFn(error2);
        }
      });
      const inst = freeze22({
        build: () => {
          if (mTokenRange.isEmpty()) {
            return BuildStateAddition.make((sink) => {
              sink.pushNode(AstTupleNode.makeEmpty());
            });
          }
          const type = startToken().type();
          return kStartingTokenTypeToBuildAddition[type]();
        },
        range: mTokenRange.range,
        asString: () => `TPB ${mTokenRange.asString()}`,
        error
      });
      return inst;
    }
    return freeze22({ make: make3 });
  })();

  // src/operative_statement_builder/precedence_organization_node.ts
  var { freeze: freeze23, memoize: memoize9 } = Helpers;
  var nullLink = freeze23({ low: void 0, high: void 0 });
  var presentSlot = (lhs, rhs) => lhs?.isPresent() ? lhs : rhs;
  var nullVisitableInstance = freeze23({
    visit: (_0) => {
    },
    uniqueIdentifier: memoize9(Symbol)
  });
  var make = (mVisitable, mNodeInfo, mLow, mHigh, mLinks_) => {
    const mLinks = mLinks_ ?? nullLink;
    const makeLinksFromExtremes = (otherInstances) => freeze23({
      low: mLow.get(otherInstances),
      high: mHigh.get(otherInstances)
    });
    mVisitable.uniqueIdentifier();
    const inst = freeze23({
      compare: (other) => -other.compareToInfo(mNodeInfo),
      compareToInfo: (nodeInfo) => -nodeInfo.compare(mNodeInfo),
      visit: (visitor) => visitor.visitLinks(
        mLinks.low ?? nullVisitableInstance,
        mVisitable,
        mLinks.high ?? nullVisitableInstance
      ),
      lowSlot: () => mLow,
      highSlot: () => mHigh,
      asString: mVisitable.asString,
      uniqueIdentifier: mVisitable.uniqueIdentifier,
      possessExtremesOn: (otherInstances) => {
        const links = makeLinksFromExtremes(otherInstances);
        const newInst = make(
          mVisitable,
          mNodeInfo,
          presentSlot(links.low?.lowSlot(), mLow),
          presentSlot(links.high?.highSlot(), mHigh),
          links
        );
        newInst.lowSlot().set(otherInstances, newInst);
        newInst.highSlot().set(otherInstances, newInst);
        return newInst;
      }
    });
    return inst;
  };
  var PrecedenceOrganizationNode = freeze23({
    workCollection: (collection) => {
      const processOrder = [...collection].sort((a, b) => -a.compare(b));
      processOrder.map((n) => n.possessExtremesOn(collection));
      return collection[0];
    },
    isNullVisitable: (vnd) => nullVisitableInstance.uniqueIdentifier() === vnd.uniqueIdentifier(),
    make
  });

  // src/operative_statement_builder/visitable_node_datum.ts
  var { freeze: freeze24, memoize: memoize10 } = Helpers;
  var VisitableNodeDatum = freeze24({
    makeForToken: (token) => freeze24({
      asString: token.content,
      uniqueIdentifier: memoize10(Symbol),
      visit: (visitor) => visitor.visitToken(token)
    }),
    makeForNode: (node) => freeze24({
      asString: node.asString,
      uniqueIdentifier: memoize10(Symbol),
      visit: (visitor) => visitor.visitNode(node)
    })
  });

  // src/operative_statement_builder/organization_node_slot.ts
  var { freeze: freeze25 } = Helpers;
  var class_2 = freeze25({
    makeAt: (mIndex) => freeze25({
      set: (otherInstances, o) => {
        otherInstances[mIndex] = o;
      },
      get: (otherInstances) => otherInstances[mIndex],
      isPresent: () => true,
      index: mIndex
    }),
    makeWriteOnly: (mIndex) => freeze25({
      set: (otherInstances, o) => {
        otherInstances[mIndex] = o;
      },
      get: (_0) => void 0,
      isPresent: () => true
    }),
    makeLeft: (mIndex) => class_2.makeAt(mIndex - 1),
    makeRight: (mIndex) => class_2.makeAt(mIndex + 1),
    makeNull: (_0) => freeze25({
      set: (_02, _1) => {
      },
      get: (_02) => void 0,
      isPresent: () => false
    })
  });
  var OrganizationNodeSlot = class_2;

  // src/operative_statement_builder/node_type_info_instances.ts
  var { memoize: memoize11, freeze: freeze26 } = Helpers;
  var NodeTypeInfoInstance = freeze26({
    makeFunctions: (constructor) => {
      const instancesOnBinaryOperators = memoize11(() => makeInstancesOnOperatorListing(OperatorDefinitions.binaryListing));
      const instancesOnUnaryOperators = memoize11(() => makeInstancesOnOperatorListing(OperatorDefinitions.unaryListing));
      const makeToDict = (low, high) => (def) => freeze26({ [def.representation]: constructor(low, high, def.precedence) });
      const fallBackInstance2 = memoize11(() => {
        const { makeNull } = OrganizationNodeSlot;
        return constructor(makeNull, makeNull, fallbackDefinition().precedence);
      });
      const fallbackDefinition = memoize11(() => freeze26({
        representation: "<FRINGE>",
        operandRelation: "<NONE>",
        precedence: Math.max(
          ...OperatorDefinitions.fullListing().map((def) => def.precedence)
        )
      }));
      function makeInstancesOnOperatorListing(fn) {
        const { makeLeft, makeRight, makeWriteOnly } = OrganizationNodeSlot;
        const fringe = freeze26({ [fallbackDefinition().representation]: fallBackInstance2() });
        const makeBinary = makeToDict(makeLeft, makeRight);
        const makeUnary = makeToDict(makeWriteOnly, makeRight);
        const dict = fn();
        const { unary, binary } = OperatorDefinitions.operandRelationships;
        const asArray = Object.keys(dict).map((representation) => {
          const def = dict[representation];
          if (def.operandRelation === unary) {
            return makeUnary(def);
          } else if (def.operandRelation === binary) {
            return makeBinary(def);
          }
          return fringe;
        });
        return Object.assign({}, ...asArray);
      }
      ;
      const makeIntermediateNodeWith = (instances) => (token, index) => {
        const primaryInst = instances()[token.content()];
        const inst = primaryInst ?? fallBackInstance2();
        return inst.makeIntermediateNode(VisitableNodeDatum.makeForToken(token), index);
      };
      return freeze26({
        makeIntermediateNodeForBinary: makeIntermediateNodeWith(instancesOnBinaryOperators),
        makeIntermediateNodeForUnary: makeIntermediateNodeWith(instancesOnUnaryOperators),
        fallBackInstance: fallBackInstance2
      });
    }
  });

  // src/operative_statement_builder/organization_node_type_info.ts
  var { freeze: freeze27, memoize: memoize12 } = Helpers;
  var make2 = (mMakeLow, mMakeHigh, mPrecedence) => {
    const inst = freeze27({
      makeIntermediateNode: (mVisitable, index) => PrecedenceOrganizationNode.make(mVisitable, inst, mMakeLow(index), mMakeHigh(index)),
      compare: (other) => -other.comparePrecedenceIndex(mPrecedence),
      comparePrecedenceIndex: (index) => mPrecedence - index
    });
    return inst;
  };
  var {
    fallBackInstance,
    makeIntermediateNodeForBinary,
    makeIntermediateNodeForUnary
  } = NodeTypeInfoInstance.makeFunctions(make2);
  var someMap = memoize12(() => freeze27({
    [OperatorDefinitions.operandRelationships.binary]: makeIntermediateNodeForBinary,
    [OperatorDefinitions.operandRelationships.unary]: makeIntermediateNodeForUnary,
    [OperatorDefinitions.operandRelationships.fringe]: (token, index) => fallBackInstance().makeIntermediateNode(VisitableNodeDatum.makeForToken(token), index)
  }));
  var class_3 = freeze27({
    forTesting: {
      onFallback: memoize12(() => (token, index) => fallBackInstance().makeIntermediateNode(VisitableNodeDatum.makeForToken(token), index))
    },
    onOperandRelation: (operandRelation) => someMap()[operandRelation] ?? (() => {
      throw new Error(`"${operandRelation}" is not an operand relation`);
    })(),
    makeIntermediateNodeForNode: (node, index) => {
      const inst = fallBackInstance();
      return inst.makeIntermediateNode(VisitableNodeDatum.makeForNode(node), index);
    },
    make: make2
  });
  var OrganizationNodeTypeInfo = class_3;

  // src/operative_statement_completion.ts
  var { freeze: freeze28, memoize: memoize13 } = Helpers;
  var OperativeStatementCompletion = (() => {
    const make3 = (mNodes) => {
      const { error, setErrorMessage, hasErrorSet } = StandardError.make();
      const { isNullVisitable } = PrecedenceOrganizationNode;
      const mCounts = {};
      const isValidVisitable = (vst) => {
        if (!isNullVisitable(vst)) {
          return mCounts[vst.uniqueIdentifier()] === 1;
        }
        return true;
      };
      const markVisitable = (vst) => {
        const id = vst.uniqueIdentifier();
        mCounts[id] = (mCounts[id] ?? 0) + 1;
      };
      const verifyAllVisited = () => {
        mNodes.forEach((pon) => {
          if (!isValidVisitable(pon)) {
            setErrorMessage(`Expression malformed around "${pon.asString()}"`);
          }
        });
      };
      const mInternalVisitor = freeze28({
        visitToken: (_0) => {
        },
        visitNode: (_0) => {
        },
        visitLinks: (low, node, high) => {
          markVisitable(node);
          if (hasErrorSet()) {
            return;
          }
          low.visit(mInternalVisitor);
          high.visit(mInternalVisitor);
        }
      });
      const inst = freeze28({
        rootVisitable: memoize13(() => {
          if (inst.isEmpty()) {
            return void 0;
          }
          const pon = PrecedenceOrganizationNode.workCollection(mNodes);
          if (!pon) {
            setErrorMessage("working operative statement collection failed");
            return void 0;
          }
          pon.visit(mInternalVisitor);
          if (hasErrorSet()) {
            return void 0;
          }
          verifyAllVisited();
          if (hasErrorSet()) {
            return void 0;
          }
          return pon;
        }),
        isEmpty: () => mNodes.length === 0,
        error
      });
      return inst;
    };
    return freeze28({ make: make3 });
  })();

  // src/operative_statement_builder.ts
  var { freeze: freeze29, memoize: memoize14 } = Helpers;
  var { makeIntermediateNodeForNode } = OrganizationNodeTypeInfo;
  var OperativeStatementBuilder = freeze29({
    makeFromTokens: (tokens, representationToOperandRelation) => {
      const data = tokens.map((token, index) => {
        const operandRelation = representationToOperandRelation[token.content()];
        const mapperFn = operandRelation ? OrganizationNodeTypeInfo.onOperandRelation(operandRelation) : OrganizationNodeTypeInfo.forTesting.onFallback();
        return mapperFn(token, index);
      });
      return OperativeStatementBuilder.make(data);
    },
    make: (mData = []) => freeze29({
      pushToken: (token, operandRelation) => {
        const creatorFn = OrganizationNodeTypeInfo.onOperandRelation(operandRelation);
        mData.push(creatorFn(token, mData.length));
      },
      pushNode: (node) => {
        mData.push(makeIntermediateNodeForNode(node, mData.length));
      },
      completion: memoize14(() => OperativeStatementCompletion.make(mData))
    })
  });

  // src/ast_let_declaration_node.ts
  var { freeze: freeze30 } = Helpers;
  var AstLetDeclarationNode = freeze30({
    make: (node) => {
      const { executionType } = node;
      const { letDeclaration } = AstNode.types;
      const inst = freeze30({
        visit: (visitor) => {
          visitor.visitLetDeclaration(inst, node);
        },
        type: () => letDeclaration,
        executionType: (types) => {
          return executionType(types);
        },
        asString: () => `let ${node.asString()}...`
      });
      return inst;
    }
  });

  // src/ast_function_call_node.ts
  var AstFunctionCallNode = (() => {
    const nodeTypes = AstNode.types;
    function make3(_0, lhs, rhsArgs) {
      const arguments_ = (() => {
        if (rhsArgs.type() === nodeTypes.tuple) {
          return rhsArgs;
        }
        return AstTupleNode.make(",", [rhsArgs]);
      })();
      const name = (() => {
        switch (lhs.type()) {
          case nodeTypes.identifier:
          case nodeTypes.stringLiteral:
            return lhs.asString();
          default:
            throw Error("unhandled");
        }
      })();
      const inst = Object.freeze({
        name,
        asString: () => `${name}(...)`,
        arguments: arguments_,
        visit: (visitor) => {
          lhs.visit(visitor);
          visitor.visitFunctionCall(inst);
        },
        type: () => nodeTypes.functionCall,
        executionType: (_02) => {
          throw Error("executionType is not implemented for function call nodes");
        }
      });
      return inst;
    }
    return Object.freeze({ make: make3 });
  })();

  // src/ast_build/operative_statement_ast_creation.ts
  var { freeze: freeze31 } = Helpers;
  var OperativeStatementAstCreation = freeze31({
    make: () => {
      const mNodeStack = [];
      const popOrThrow = () => {
        return mNodeStack.pop() ?? (() => {
          throw new Error("nodes depleted");
        })();
      };
      const binaryOperator = (token) => {
        const first = popOrThrow();
        mNodeStack.push(AstBinaryOperatorNode.make(token.content(), popOrThrow(), first));
      };
      const tupleOperator = (token) => {
        const first = popOrThrow();
        const second = popOrThrow();
        if (second.type() === AstNode.types.tuple) {
          second.append(first);
          return mNodeStack.push(second);
        }
        mNodeStack.push(AstTupleNode.makeBinary(token.content(), second, first));
      };
      const letOperator = (_0) => {
        mNodeStack.push(AstLetDeclarationNode.make(popOrThrow()));
      };
      const functionCall = (token) => {
        const first = popOrThrow();
        mNodeStack.push(AstFunctionCallNode.make(token.content(), popOrThrow(), first));
      };
      const mOperatorFactories = {
        ["+"]: binaryOperator,
        [","]: tupleOperator,
        [":="]: binaryOperator,
        ["-"]: binaryOperator,
        ["*"]: binaryOperator,
        ["let"]: letOperator,
        [Token.kCallToken.content()]: functionCall
      };
      const inst = freeze31({
        visitToken: (token) => {
          const opFactory = mOperatorFactories[token.content()];
          if (opFactory) {
            return opFactory(token);
          }
          mNodeStack.push(AstFringeNode.makeForToken(token));
        },
        visitNode: (node) => {
          mNodeStack.push(node);
        },
        visitLinks: (low, node, high) => {
          low.visit(inst);
          high.visit(inst);
          node.visit(inst);
        },
        finish: () => {
          const node = popOrThrow();
          if (mNodeStack.length !== 0) {
            throw new Error("uh oh");
          }
          return node;
        }
      });
      return inst;
    }
  });

  // src/ast_function_definition_node.ts
  var { freeze: freeze32 } = Helpers;
  var AstFunctionDefinitionNode = freeze32({
    nodeType: () => AstNode.types.functionDefinition,
    make: (mSubExpressions) => {
      const inst = freeze32({
        visit: (visitor) => visitor.visitFunctionDefinition(inst, mSubExpressions),
        type: AstFunctionDefinitionNode.nodeType,
        executionType: (typeTable) => typeTable.lookUpFunctionType(),
        count: () => mSubExpressions.length,
        asString: () => `<fn def>`
      });
      return inst;
    }
  });

  // src/ast_build/block_builder.ts
  var { freeze: freeze33 } = Helpers;
  var sPrintOutCompletions = false;
  var BlockBuilder = freeze33({
    setPrintOutCompletionsEnabled: (b) => {
      sPrintOutCompletions = b;
    },
    make: (mErrors = []) => {
      const mLineNodes = [];
      const mStatementBuilders = [OperativeStatementBuilder.make()];
      const throwAlreadyPopped = () => {
        throw new Error("All group frames already popped");
      };
      const lastStatementBuilder = () => mStatementBuilders[mStatementBuilders.length - 1] ?? throwAlreadyPopped();
      const lineNodesAsString = () => {
        let s = "lines<";
        mLineNodes.forEach((node) => {
          s = `${s} ${node.asString()}, `;
        });
        return `${s}>`;
      };
      const inst = freeze33({
        pushToken: (token, operandRelation) => {
          lastStatementBuilder().pushToken(token, operandRelation);
          return inst;
        },
        pushNode: (node) => {
          lastStatementBuilder().pushNode(node);
          return inst;
        },
        pushStatement: () => {
          mStatementBuilders.push(OperativeStatementBuilder.make());
          return inst;
        },
        popStatement: (fn) => {
          const lastBuilder = mStatementBuilders.pop() ?? throwAlreadyPopped();
          const { rootVisitable, isEmpty, error } = lastBuilder.completion();
          const osvNode = rootVisitable();
          if (osvNode) {
            const visitor = OperativeStatementAstCreation.make();
            osvNode.visit(visitor);
            const node = fn(visitor.finish());
            if (node) {
              inst.pushNode(node);
            }
          } else if (!isEmpty()) {
            mErrors.push(error());
          }
          return inst;
        },
        pushNewLine: () => inst.popStatement((node) => {
          mLineNodes.push(node);
          return void 0;
        }).pushStatement(),
        statementCount: () => mStatementBuilders.length,
        complete: () => {
          inst.popStatement((node) => {
            mLineNodes.push(node);
            return void 0;
          });
          if (sPrintOutCompletions) {
            console.log(lineNodesAsString());
          }
          if (mStatementBuilders.length !== 0) {
            throw new Error(`there are still statement builders left`);
          }
          return AstFunctionDefinitionNode.make(mLineNodes);
        }
      });
      return inst;
    }
  });

  // src/ast_build/build_state.ts
  var { freeze: freeze34 } = Helpers;
  var BuildState = freeze34({
    make: (mErrors = []) => {
      const mBuildParts = [];
      const mBlockBuilders = [BlockBuilder.make(mErrors)];
      const throwNoRemainingBuilders = () => {
        throw new Error("no remaining block builders");
      };
      const lastBlockBuilder = () => mBlockBuilders[mBlockBuilders.length - 1] ?? throwNoRemainingBuilders();
      const pushBlock = () => {
        mBlockBuilders.push(BlockBuilder.make(mErrors));
        return inst;
      };
      const popBlock = (fn) => {
        const lastBuilder = mBlockBuilders.pop() ?? throwNoRemainingBuilders();
        const node = fn(lastBuilder.complete());
        if (node) {
          inst.pushNode(node);
        }
        return inst;
      };
      const inst = freeze34({
        hasRemainingParts: () => mBuildParts.length > 0,
        pushPart: (buildPart) => mBuildParts.push(buildPart) && inst,
        popPart: () => {
          return mBuildParts.pop() ?? (() => {
            throw new Error("no parts remain");
          })();
        },
        pushToken: (token, operandRelation) => lastBlockBuilder().pushToken(token, operandRelation) && inst,
        pushNode: (node) => lastBlockBuilder().pushNode(node) && inst,
        pushStatement: () => lastBlockBuilder().pushStatement() && inst,
        popStatement: (fn) => lastBlockBuilder().popStatement(fn) && inst,
        pushNewLine: () => lastBlockBuilder().pushNewLine() && inst,
        pushBlock,
        popBlock,
        complete: () => lastBlockBuilder().complete(),
        asString: () => {
          let s = `(Blocks ${mBlockBuilders.length}, Statements ${lastBlockBuilder().statementCount()})`;
          mBuildParts.forEach((part) => {
            s = `${s} {${part.asString()}}`;
          });
          return s;
        }
      });
      return inst;
    }
  });

  // src/ast_build.ts
  var AstBuild = (() => {
    const { freeze: freeze38, memoize: memoize17 } = Helpers;
    let sPrintOutTpbs = false;
    const class_4 = freeze38({
      setPrintOutsEnabled: (b) => {
        sPrintOutTpbs = b;
      },
      make: (mTokens) => {
        const mErrors = [];
        const mBuildState = BuildState.make(mErrors);
        const inst = freeze38({
          build: memoize17(() => {
            mBuildState.pushPart(TreePartBuild.make(mTokens));
            if (sPrintOutTpbs) {
              console.log(`init ${mBuildState.asString()}`);
            }
            while (mBuildState.hasRemainingParts()) {
              if (sPrintOutTpbs) {
                console.log(mBuildState.asString());
              }
              const part = mBuildState.popPart();
              const addition = part.build();
              if (!addition) {
                mErrors.push(part.error());
                return;
              }
              addition.pushTo(mBuildState);
            }
            if (sPrintOutTpbs) {
              console.log(`on complete ${mBuildState.asString()}`);
            }
            return mBuildState.complete();
          }),
          errors: () => mErrors
        });
        return inst;
      },
      buildFor: (tokens) => {
        const inst = class_4.make(tokens);
        const res = inst.build();
        if (!res) {
          throw Error(`Failed to build AST:
${inst.errors()[0]?.message}`);
        }
        return res;
      }
    });
    return class_4;
  })();

  // tests/ast_build_tests.ts
  var { describeNamed: describeNamed3 } = TestHelpers;
  describeNamed3({ AstBuild }, () => {
    const makeToken = Token.forTesting.makeFromStringOnly;
    function makeBuildAst(tokens) {
      return () => AstBuild.buildFor(TokenRange.makeStartingRange(tokens()));
    }
    describe("builds a mutli-line ast", () => {
      let tokens = [];
      const buildAst = makeBuildAst(() => tokens);
      it("builds two function calls", () => {
        const { points, verifyAllHit } = ReachPoint.makeCollection(1);
        tokens = [
          makeToken("puts"),
          makeToken("("),
          makeToken("a"),
          makeToken(")"),
          makeToken("\n"),
          makeToken("puts"),
          makeToken("("),
          makeToken("a"),
          makeToken(")"),
          makeToken("\n")
        ];
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitFunctionCall((node) => {
          points()[0].hitsAtExactly(2);
          node.arguments.forEach((node2) => {
            node2.visit(visitor);
          });
        }).finish();
        buildAst().visit(visitor);
        expect(verifyAllHit()).toBeTruthy();
      });
      it("two lines, operator first, call second", () => {
        const { hitsAtExactly, verifyHit } = ReachPoint.make();
        tokens = [
          makeToken("\n"),
          makeToken("a"),
          makeToken(","),
          makeToken("b"),
          makeToken("\n"),
          makeToken("puts"),
          makeToken("("),
          makeToken("a"),
          makeToken(")"),
          makeToken("\n")
        ];
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitFunctionCall((node) => {
          hitsAtExactly(1);
          node.arguments.forEach((node2) => {
            node2.visit(visitor);
          });
        }).finish();
        buildAst().visit(visitor);
        expect(verifyHit()).toBeTruthy();
      });
      it("builds ast with arthimetic", () => {
        tokens = [
          makeToken("2"),
          makeToken("+"),
          makeToken("2")
        ];
        let vop = "";
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitBinaryOperation((node, lhs, rhs) => {
          const { valueOf } = AstIntegerLiteralNode;
          vop = node.operation();
          expect(valueOf(lhs)).toEqual(2);
          expect(valueOf(rhs)).toEqual(2);
        }).finish();
        buildAst().visit(visitor);
        expect(vop).toEqual("+");
      });
      it("builds ast with let declaration", () => {
        tokens = [
          makeToken("let"),
          makeToken("a"),
          makeToken(":="),
          makeToken("2")
        ];
        const { points, verifyAllHit } = ReachPoint.makeCollection(3);
        const [pt1, pt2, pt3] = points();
        const foundOperators = [];
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitBinaryOperation((node, lhs, rhs) => {
          foundOperators.push(node.operation());
          pt1.hitsAtExactly(1);
          lhs.visit(visitor);
          rhs.visit(visitor);
        }).visitLetDeclaration((_0, rhs) => {
          pt2.hitsAtExactly(1);
          rhs.visit(visitor);
        }).visitIdentifier((node) => {
          expect(node.asString()).toEqual("a");
          pt3.hitsAtExactly(1);
        }).finish();
        buildAst().visit(visitor);
        expect(foundOperators).toEqual([":="]);
        expect(verifyAllHit()).toBeTruthy();
      });
      it("builds ast with multiple operators", () => {
        tokens = [
          makeToken("let"),
          makeToken("a"),
          makeToken(":="),
          makeToken("2"),
          makeToken("+"),
          makeToken("3")
        ];
        const foundOperators = [];
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitBinaryOperation((node, lhs, rhs) => {
          foundOperators.push(node.operation());
          lhs.visit(visitor);
          rhs.visit(visitor);
        }).finish();
        buildAst().visit(visitor);
        expect(foundOperators).toEqual([":=", "+"]);
      });
      it("builds ast with multiple lines end on an unary operator", () => {
        tokens = [
          makeToken("a"),
          makeToken("\n"),
          makeToken("let"),
          makeToken("a"),
          makeToken(":="),
          makeToken("2")
        ];
        const rootNode = buildAst();
        if (rootNode.type() !== AstNode.types.functionDefinition) {
          return fail();
        }
        expect(rootNode.count()).toEqual(2);
      });
      it("builds ast with multiple lines of unary operators", () => {
        tokens = [
          makeToken("let"),
          makeToken("b"),
          makeToken(":="),
          makeToken("2"),
          makeToken("\n"),
          makeToken("let"),
          makeToken("a"),
          makeToken(":="),
          makeToken("2"),
          makeToken("\n"),
          makeToken("a")
        ];
        const rootNode = buildAst();
        if (rootNode.type() !== AstNode.types.functionDefinition) {
          return fail();
        }
        expect(rootNode.count()).toEqual(3);
      });
    });
    function includeAllNIdentifiers(astRes, identifiers) {
      it(`includes all ${identifiers.length} identifiers, in correct order`, () => {
        const identifiers2 = [];
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitIdentifier((node) => {
          identifiers2.push(node.asString());
        }).finish();
        const rootNode = astRes();
        rootNode.visit(visitor);
        expect(identifiers2).toEqual(identifiers2);
      });
    }
    describe("a + b + c", () => {
      const tokens = [
        makeToken("a"),
        makeToken("+"),
        makeToken("b"),
        makeToken("+"),
        makeToken("c")
      ];
      const buildAst = () => AstBuild.buildFor(TokenRange.makeStartingRange(tokens));
      includeAllNIdentifiers(buildAst, ["a", "b", "c"]);
      it("includes two operators", () => {
        const { hitsAtExactly, verifyHit } = ReachPoint.make();
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitBinaryOperation((node) => {
          hitsAtExactly(2);
          node.visitChildren(visitor);
        }).finish();
        const rootNode = buildAst();
        rootNode.visit(visitor);
        expect(verifyHit()).toBeTruthy();
      });
    });
    describe("let a := b", () => {
      const buildAst = makeBuildAst(() => [
        makeToken("let"),
        makeToken("a"),
        makeToken(":="),
        makeToken("1")
      ]);
      includeAllNIdentifiers(buildAst, ["a", "b"]);
      it('includes one ":=" operators', () => {
        const { hitsAtExactly, verifyHit } = ReachPoint.make();
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitBinaryOperation((node) => {
          hitsAtExactly(1);
          expect(node.operation()).toEqual(":=");
          node.visitChildren(visitor);
        }).finish();
        const rootNode = buildAst();
        rootNode.visit(visitor);
        expect(verifyHit()).toBeTruthy();
      });
    });
    describe("\\naskString()", () => {
      const buildAst = makeBuildAst(() => [
        makeToken("\n"),
        makeToken("askString"),
        makeToken("("),
        makeToken(")"),
        makeToken("\n")
      ]);
      it("builds single function call node", () => {
        const { hitsAtExactly, verifyHit } = ReachPoint.make();
        const rootNode = buildAst();
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitFunctionCall((node) => {
          hitsAtExactly(1);
          expect(node.name).toEqual("askString");
        }).finish();
        rootNode.visit(visitor);
        expect(verifyHit()).toBeTruthy();
      });
      it("function call node takes no arguments", () => {
        const { hitsAtExactly, verifyHit } = ReachPoint.make();
        const rootNode = buildAst();
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitFunctionCall((node) => {
          hitsAtExactly(1);
          expect(node.arguments.count()).toEqual(0);
        }).finish();
        rootNode.visit(visitor);
        expect(verifyHit()).toBeTruthy();
      });
    });
    describe("puts(a, b)\\n", () => {
      const tokens = [
        makeToken("puts"),
        makeToken("("),
        makeToken("a"),
        makeToken(","),
        makeToken("b"),
        makeToken(")"),
        makeToken("\n")
      ];
      const buildAst = () => AstBuild.buildFor(TokenRange.makeStartingRange(tokens));
      it("creates a function node", () => {
        const { verifyHit, hitsAtExactly } = ReachPoint.make();
        const rootNode = buildAst();
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitFunctionCall((_0) => {
          hitsAtExactly(1);
        }).finish();
        rootNode.visit(visitor);
        expect(verifyHit()).toBeTruthy();
      });
      it('creates a function node with name "puts"', () => {
        const { verifyHit, hitsAtExactly } = ReachPoint.make();
        const rootNode = buildAst();
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitFunctionCall((node) => {
          hitsAtExactly(1);
          expect(node.name).toEqual("puts");
        }).finish();
        rootNode.visit(visitor);
        expect(verifyHit()).toBeTruthy();
      });
      it("passes two arguments to puts call", () => {
        const { verifyHit, hitsAtExactly } = ReachPoint.make();
        const rootNode = buildAst();
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitFunctionCall((node) => {
          hitsAtExactly(1);
          expect(node.arguments.count()).toEqual(2);
        }).finish();
        rootNode.visit(visitor);
        expect(verifyHit()).toBeTruthy();
      });
    });
    describe("with function blocks", () => {
      const tokens = [
        "let",
        "a",
        ":=",
        "fn",
        "\n",
        "puts",
        "(",
        `'hello'`,
        ")",
        "\n",
        "~",
        "\n",
        "queue",
        "(",
        "a",
        ")"
      ].map(makeToken);
      const buildAst = () => AstBuild.buildFor(TokenRange.makeStartingRange(tokens));
      it('has two references to variable "a"', () => {
        let aCount = 0;
        const rootNode = buildAst();
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitLetDeclaration((_0, node) => {
          node.visit(visitor);
        }).visitIdentifier((node) => {
          if (node.asString() === "a") {
            ++aCount;
          }
        }).finish();
        rootNode.visit(visitor);
        expect(aCount).toEqual(2);
      });
      it("has a correctly named let declaration", () => {
        const { hitsAtExactly, verifyHit } = ReachPoint.make();
        const rootNode = buildAst();
        let inLet = false;
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitLetDeclaration((_0, decNode) => {
          inLet = true;
          decNode.visit(visitor);
          inLet = false;
        }).visitBinaryOperation((_0, lhs, _2) => {
          if (!inLet) {
            return;
          }
          hitsAtExactly(1);
          expect(lhs.asString()).toEqual("a");
        }).finish();
        rootNode.visit(visitor);
        expect(verifyHit()).toBeTruthy();
      });
      it("has a function definition", () => {
        const { hitsAtExactly, verifyHit } = ReachPoint.make();
        const rootNode = buildAst();
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitFunctionDefinition((_0, _1) => {
          hitsAtExactly(1);
        }).finish();
        rootNode.visit(visitor);
        expect(verifyHit()).toBeTruthy();
      });
      it("queue call is outside the function definition", () => {
        const rootNode = buildAst();
        const { hitsAtExactly, verifyHit } = ReachPoint.make();
        let depth = 0;
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitFunctionDefinition((_0, lineNodes) => {
          ++depth;
          lineNodes.forEach((node) => node.visit(visitor));
          --depth;
        }).visitIdentifier((node) => {
          if (depth > 1) {
            expect(node.asString()).not.toEqual("queue");
          } else if (node.asString() === "queue") {
            hitsAtExactly(1);
          }
        }).finish();
        rootNode.visit(visitor);
        expect(verifyHit()).toBeTruthy();
      });
    });
    describe("single line ast", () => {
      let tokens = [];
      const buildAst = () => AstBuild.buildFor(TokenRange.makeStartingRange(tokens));
      const exactlyOneFunctionCallNamed = (fnname) => {
        const { verifyHit, hitsAtExactly } = ReachPoint.make();
        const rootNode = buildAst();
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitFunctionCall((node) => {
          hitsAtExactly(1);
          expect(node.name).toEqual(fnname);
          expect(node.arguments.count()).toEqual(0);
        }).finish();
        rootNode.visit(visitor);
        return verifyHit();
      };
      it("builds a simple function call", () => {
        tokens = [
          makeToken("\n"),
          makeToken("askString"),
          makeToken("("),
          makeToken(")"),
          makeToken("\n")
        ];
        expect(exactlyOneFunctionCallNamed("askString")).toBeTruthy();
      });
      it('"let a := askString()"', () => {
        tokens = [
          makeToken("let"),
          makeToken("a"),
          makeToken(":="),
          makeToken("askString"),
          makeToken("("),
          makeToken(")")
        ];
        expect(exactlyOneFunctionCallNamed("askString")).toBeTruthy();
      });
      it('"puts(askString())"', () => {
        tokens = [
          makeToken("puts"),
          makeToken("("),
          makeToken("askString"),
          makeToken("("),
          makeToken(")"),
          makeToken(")")
        ];
        const { verifyHit, hitsAtExactly } = ReachPoint.make();
        const rootNode = buildAst();
        const fnnames = [];
        const kExpectArgumentCount = Object.freeze({
          askString: 0,
          puts: 1
        });
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitFunctionCall((node) => {
          hitsAtExactly(2);
          fnnames.push(node.name);
          expect(node.arguments.count()).toEqual(kExpectArgumentCount[node.name]);
          node.arguments.forEach((node2) => node2.visit(visitor));
        }).finish();
        rootNode.visit(visitor);
        expect(verifyHit()).toBeTruthy();
        expect(fnnames.sort()).toEqual(["askString", "puts"]);
      });
      it("puts(2 + 3, 5 + 9)", () => {
        tokens = [
          makeToken("puts"),
          makeToken("("),
          makeToken("2"),
          makeToken("+"),
          makeToken("3"),
          makeToken(","),
          makeToken("5"),
          makeToken("+"),
          makeToken("9"),
          makeToken(")")
        ];
        const { verifyAllHit, points } = ReachPoint.makeCollection(3);
        const [pt1, pt2, pt3] = points();
        const { binaryOperator } = AstNode.types;
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitBinaryOperation((node) => {
          pt2.hitsAtExactly(2);
          expect(node.operation()).toEqual("+");
        }).visitFunctionCall((node) => {
          expect(node.name).toEqual("puts");
          pt3.hitsAtExactly(1);
          node.arguments.forEach((node2) => {
            expect(node2.type()).toEqual(binaryOperator);
            pt1.hitsAtExactly(2);
            node2.visit(visitor);
          });
        }).finish();
        buildAst().visit(visitor);
        expect(verifyAllHit()).toBeTruthy();
      });
      it("puts(askString(), askString())", () => {
        tokens = [
          makeToken("puts"),
          makeToken("("),
          makeToken("askString"),
          makeToken("("),
          makeToken(")"),
          makeToken(","),
          makeToken("askString"),
          makeToken("("),
          makeToken(")"),
          makeToken(")")
        ];
        const { verifyAllHit, points } = ReachPoint.makeCollection(2);
        const [pt1, pt2] = points();
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitFunctionCall((node) => {
          expect(node.name).toEqual("puts");
          pt1.hitsAtExactly(1);
          node.arguments.forEach((node2) => {
            const { functionCall } = AstNode.types;
            expect(node2.type()).toEqual(functionCall);
            if (node2.type() === functionCall) {
              pt2.hitsAtExactly(2);
              expect(node2.name).toEqual("askString");
            }
          });
        }).finish();
        buildAst().visit(visitor);
        expect(verifyAllHit()).toBeTruthy();
      });
      it(`puts(('hello'))`, () => {
        tokens = [
          makeToken("puts"),
          makeToken("("),
          makeToken("("),
          makeToken(`'hello'`),
          makeToken(")"),
          makeToken(")")
        ];
        const pt1 = ReachPoint.make();
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitFunctionCall((node) => {
          expect(node.name).toEqual("puts");
          pt1.hitsAtExactly(1);
        }).finish();
        buildAst().visit(visitor);
        expect(pt1.verifyHit()).toBeTruthy();
      });
    });
  });

  // tests/ast_build/tree_part_build_tests.ts
  var { describeNamed: describeNamed4 } = TestHelpers;
  describeNamed4({ TreePartBuild }, () => {
    const make3 = (tokens) => TreePartBuild.make(TokenRange.makeStartingRange(tokens.map(Token.forTesting.makeFromStringOnly)));
    const makeBuildSink = ({
      pushPart,
      pushStatement,
      popStatement,
      pushToken,
      pushNode,
      pushNewLine
    }) => {
      pushPart ??= (_0) => inst;
      pushStatement ??= () => inst;
      popStatement ??= (_0) => inst;
      pushToken ??= (_0, _1) => inst;
      pushNode ??= (_0) => inst;
      pushNewLine ??= () => inst;
      const inst = Object.freeze({
        pushPart,
        pushStatement,
        popStatement,
        pushToken,
        pushNode,
        pushNewLine
      });
      return inst;
    };
    describe("starting with fringe tokens", () => {
      describe("fringe alone pushes a single node", () => {
        const build = () => make3(["a"]).build();
        it("is not an error", () => {
          expect(build()).toBeDefined();
        });
        it("build sink adds new fringe node", () => {
          const { hitsAtExactly, verifyHit } = ReachPoint.make();
          const sink = makeBuildSink({
            pushNode: (node) => {
              hitsAtExactly(1);
              expect(node.asString()).toEqual("a");
              return sink;
            }
          });
          build()?.pushTo(sink);
          expect(verifyHit()).toBeTruthy();
        });
      });
      describe("fringe to (tuple) grouping", () => {
        const build = () => make3(["a", "(", ")"]).build();
        it("is not an error", () => {
          expect(build()).toBeDefined();
        });
        it("build sink begins a function call", () => {
          const { hitsAtExactly, verifyHit } = ReachPoint.make();
          const sink = makeBuildSink({
            pushToken(token, operandRelation) {
              expect(operandRelation).toEqual("binary");
              expect(token.content()).toEqual(Token.kCallToken.content());
              hitsAtExactly(1);
              return sink;
            }
          });
          const addition = build();
          addition?.pushTo(sink);
          expect(verifyHit()).toBeTruthy();
        });
      });
    });
    describe("starting with grouping tokens", () => {
      describe("crossing a new line", () => {
        const build = () => make3(["(", "\n", ")"]).build();
        it("is not an error", () => {
          expect(build()).toBeDefined();
        });
        it("pushes a new grouping", () => {
          const { hitsAtExactly, verifyHit } = ReachPoint.make();
          const sink = makeBuildSink({
            pushStatement() {
              hitsAtExactly(1);
              return sink;
            }
          });
          build()?.pushTo(sink);
          expect(verifyHit()).toBeTruthy();
        });
        it("pushes a right and left part", () => {
          const { hitsAtExactly, verifyHit } = ReachPoint.make();
          const numbers = [];
          const sink = makeBuildSink({
            pushPart(buildPart) {
              hitsAtExactly(2);
              const { start, end } = buildPart.range();
              numbers.push([start, end]);
              return sink;
            }
          });
          build()?.pushTo(sink);
          expect(numbers).toEqual([[3, 3], [1, 2]]);
          expect(verifyHit()).toBeTruthy();
        });
      });
    });
    describe("begins with an operator", () => {
      describe("crossing a new line", () => {
        const build = () => make3(["not", "\n", "a"]).build();
        it("is not an error", () => {
          const addition = build();
          const sink = makeBuildSink({});
          addition?.pushTo(sink);
          expect(addition).toBeDefined();
        });
      });
    });
  });

  // tests/ast_fringe_node_tests.ts
  var { describeNamed: describeNamed5 } = TestHelpers;
  describeNamed5({ AstFringeNode }, () => {
    const makeToken = Token.forTesting.makeFromStringOnly;
    it('may come before a "+" operator', () => {
      const node = AstIdentifierNode.make("a");
      expect(node.comesBeforeOperator(makeToken("+"))).toBeTruthy();
    });
  });

  // src/execution_context.ts
  var { freeze: freeze35, memoize: memoize15 } = Helpers;
  var ExecutionContext = (() => {
    function make3() {
      const mAvailableVariables = {};
      const [string_resolution, integer_resolution] = (() => {
        const { String, Integer } = ObjectLookUpTable.getBuiltinTypes();
        return [
          TypeResolution.makeFixedForType(String),
          TypeResolution.makeFixedForType(Integer)
        ];
      })();
      function declareVariable(name) {
        if (mAvailableVariables[name]) {
          throw Error(`name "${name}" already taken`);
        }
        return mAvailableVariables[name] = ContextVariable.make();
      }
      function setVariable(name, value) {
        getVariable(name).set(value);
      }
      function tryGetVariable(name) {
        return mAvailableVariables[name];
      }
      function getVariable(name) {
        const gotten = tryGetVariable(name);
        if (!gotten) {
          throw Error(`Undeclared variable "${name}"`);
        }
        return gotten;
      }
      function getValueOfVariable(name) {
        return getVariable(name).asString();
      }
      function lookUpIdentifierType(identifierName) {
        const gotten = mAvailableVariables[identifierName];
        if (gotten) {
          return freeze35({
            resolve: gotten.type,
            error: () => StandardError.make().error()
          });
        } else {
          const { error, setErrorMessage } = StandardError.make();
          setErrorMessage(`Undeclared variable "${identifierName}"`);
          return freeze35({
            resolve: () => void 0,
            error
          });
        }
      }
      const lookUpFunctionType = memoize15(() => TypeResolution.makeFixedForType(ObjectLookUpTable.getBuiltinTypes().Function));
      return freeze35({
        lookUpIdentifierType,
        lookUpStringLiteralType: () => string_resolution,
        lookUpIntegerLiteralType: () => integer_resolution,
        declareVariable,
        getValueOfVariable,
        setVariable,
        getVariable,
        lookUpFunctionType,
        tryGetVariable
      });
    }
    return freeze35({ make: make3 });
  })();

  // src/persistent_stack.ts
  var PersistentStack = (() => {
    const { freeze: freeze38 } = Helpers;
    function make3(mDefaultMake) {
      const mMembers = [];
      let mPosition = -1;
      function _verifyNotEmpty() {
        if (!isEmpty())
          return;
        throw Error("Stack is empty");
      }
      function push(member) {
        const { length } = mMembers;
        if (mPosition + 1 === length) {
          mMembers.push(member ?? mDefaultMake());
        }
        ++mPosition;
        return mMembers[mPosition];
      }
      function pop() {
        _verifyNotEmpty();
        const rv = mMembers[mPosition];
        --mPosition;
        return rv;
      }
      function isEmpty() {
        return mPosition === -1;
      }
      return freeze38({ push, pop, isEmpty });
    }
    return freeze38({ make: make3 });
  })();

  // src/interpreter.ts
  var { freeze: freeze36 } = Object;
  var LetVisitor = (() => {
    function make3(context) {
      const inst = AstNodeVisitorBuilder.makeDefaultingToStop().visitBinaryOperation((node, lhs, rhs) => {
        const lhsName = AstFringeNode.downcast(lhs).asString();
        const rhsRes = rhs.executionType(context);
        const rhsType = rhsRes.resolve();
        if (!rhsType) {
          throw Error(`Cannot figure out type of function call "${node.operation()}"`);
        }
        context.declareVariable(lhsName).setType(rhsType);
      }).finish();
      return inst;
    }
    return freeze36({ make: make3 });
  })();
  var injections = freeze36({
    putsFunction: console.log,
    // just make it random
    askStringFunction: () => "bees"
  });
  var InterpreterNodeVisitor = freeze36({
    make: (context, { putsFunction, askStringFunction } = injections) => {
      const mLetVisitor = LetVisitor.make(context);
      const mStack = PersistentStack.make(ContextVariable.make);
      function mValueOf(node) {
        if (node.type() === AstNode.types.functionDefinition) {
          return ContextVariable.make(node);
        }
        const evalNode = AstEvaluatableNode.tryDowncast(node);
        if (evalNode) {
          return evalNode.evaluate(context.getVariable);
        }
        node.visit(inst);
        return mStack.pop();
      }
      function mPushValueOf(node) {
        mStack.push(mValueOf(node));
      }
      const kBuiltinFunctions = freeze36({
        puts: (node) => {
          node.arguments.forEach((node2) => {
            const cv = mValueOf(node2);
            putsFunction(cv.asString());
          });
        },
        askString: (_0) => {
          mStack.push().set(askStringFunction());
        },
        pass: (node) => node.arguments.forEach(mPushValueOf)
      });
      const inst = freeze36({
        visitFunctionCall: (node) => {
          const cvar = context.tryGetVariable(node.name);
          if (cvar) {
            return inst.callFunctionDefinition(cvar.asNode());
          }
          const fn = kBuiltinFunctions[node.name];
          if (!fn) {
            throw Error(`unimplemented function "${node.name}"`);
          }
          fn(node);
        },
        visitLetDeclaration: (_node, lhs) => {
          lhs.visit(mLetVisitor);
          lhs.visit(inst);
        },
        // see a tuple node, just visit it, which in turn evaluate it?
        visitTuple: (node) => {
          node.forEach((node2) => node2.visit(inst));
        },
        visitFunctionDefinition: (_0, _1) => {
        },
        visitIdentifier: (_0) => {
        },
        visitBinaryOperation: (node, lhs, rhs) => {
          lhs.visit(inst);
          rhs.visit(inst);
          const op = node.operation();
          const func = lhs.executionType(context).resolve()?.lookUp(op);
          if (!func) {
            throw Error(`Cannot look up function "${op}"`);
          }
          const rhsAsParam = rhs.executionType(context).resolve()?.asSingluarParameter();
          if (!rhsAsParam) {
            throw Error(`Cannot look up rhs type`);
          }
          const deg = func.satisfactionDegreeOfArguments(rhsAsParam);
          if (typeof deg === "undefined") {
            throw Error("");
          }
          const builtIn = func.builtIn();
          if (typeof builtIn === "undefined") {
            throw Error("");
          }
          const lhsVal = mValueOf(lhs);
          const rhsVal = mValueOf(rhs);
          builtIn(mStack, lhsVal, rhsVal);
        },
        callFunctionDefinition: (() => {
          const topVisitor = AstNodeVisitorBuilder.makeDefaultingToStop().visitFunctionDefinition((_0, lineNodes) => {
            lineNodes.forEach((node) => {
              node.visit(inst);
            });
          }).finish();
          return (node) => node.visit(topVisitor);
        })()
      });
      return inst;
    }
  });
  var Interpreter = freeze36({
    make: (context = ExecutionContext.make(), injections_ = injections) => {
      const mVisitor = InterpreterNodeVisitor.make(context, injections_);
      function interpret(node) {
        if (node.type() !== AstNode.types.functionDefinition) {
          throw new Error("node must be a function defintion");
        }
        mVisitor.callFunctionDefinition(node);
      }
      return freeze36({ interpret });
    },
    buildFor: (inp) => {
      const tokenRange = Tokenization.make().tokenize(inp);
      return AstBuild.buildFor(tokenRange);
    },
    buildAndRun: (inp) => {
      const tokenRange = Tokenization.make().tokenize(inp);
      const astBuild = AstBuild.make(tokenRange);
      const root = astBuild.build();
      if (!root) {
        console.log("cannot build program");
        astBuild.errors().forEach(({ message }) => {
          console.log(message);
        });
        return;
      }
      Interpreter.make().interpret(root);
    }
  });
  Helpers.expose({ Interpreter });

  // tests/interpreter_tests.ts
  var { describeNamed: describeNamed6 } = TestHelpers;
  describeNamed6({ Interpreter }, () => {
    function makePutsFunction() {
      const printedStrings = [];
      const putsFunction = (str) => {
        printedStrings.push(str);
      };
      const askStringFunction = () => "baats";
      const injections2 = { putsFunction, askStringFunction };
      return { injections: injections2, printedStrings };
    }
    function makeWithInjections(putsFunction, context) {
      return Interpreter.make(context ?? ExecutionContext.make(), { putsFunction, askStringFunction: () => "bees2" });
    }
    describe("integration specs", () => {
      it('compiles and runs a "hello world!" program', () => {
        const programRootNode = Interpreter.buildFor("puts('hello', 'there', ' world!')");
        const { printedStrings, injections: injections2 } = makePutsFunction();
        const interpreter = makeWithInjections(injections2.putsFunction);
        interpreter.interpret(programRootNode);
        expect(printedStrings).toEqual(["hello", "there", " world!"]);
      });
      it('compiles and runs a "hello world!" program with a variable', () => {
        const context = ExecutionContext.make();
        context.declareVariable("foo").set("hello world!");
        const programRootNode = Interpreter.buildFor("puts(foo)");
        const { printedStrings, injections: injections2 } = makePutsFunction();
        const interpreter = Interpreter.make(context, injections2);
        interpreter.interpret(programRootNode);
        expect(printedStrings).toEqual(["hello world!"]);
      });
      it('compiles and runs a multiline "hello world!" program', () => {
        const programRootNode = Interpreter.buildFor("puts('hello')\nputs('world!')");
        const { printedStrings, injections: injections2 } = makePutsFunction();
        const interpreter = makeWithInjections(injections2.putsFunction);
        interpreter.interpret(programRootNode);
        expect(printedStrings).toEqual(["hello", "world!"]);
      });
      it('compiles and runs a "hello world!" program with an assignment', () => {
        const programRootNode = Interpreter.buildFor(`
        foo := 'hello world!'
        puts(foo)
      `);
        const { printedStrings, injections: injections2 } = makePutsFunction();
        const context = ExecutionContext.make();
        context.declareVariable("foo").set("wow");
        const intr = makeWithInjections(injections2.putsFunction, context);
        intr.interpret(programRootNode);
        expect(printedStrings).toEqual(["hello world!"]);
      });
      it("compiles and runs a simple program with a let declaration", () => {
        const programRootNode = Interpreter.buildFor(`
        let a := 'hello world!'
        puts(a)
      `);
        const { printedStrings, injections: injections2 } = makePutsFunction();
        const intr = makeWithInjections(injections2.putsFunction);
        intr.interpret(programRootNode);
        expect(printedStrings).toEqual(["hello world!"]);
      });
      it("compiles and runs a simple adder program", () => {
        const programRootNode = Interpreter.buildFor(`
        let a := 2
        let b := a + 2
        puts(b)
      `);
        const { printedStrings, injections: injections2 } = makePutsFunction();
        const intr = makeWithInjections(injections2.putsFunction);
        intr.interpret(programRootNode);
        expect(printedStrings).toEqual(["4"]);
      });
      it("compiles and runs a program with simple functions", () => {
        const rootNode = Interpreter.buildFor(`
        let a := fn
          puts('world')
        ~
        let b := fn puts('hello')
        
        b()
        a()
      `);
        const { printedStrings, injections: injections2 } = makePutsFunction();
        const intr = makeWithInjections(injections2.putsFunction);
        intr.interpret(rootNode);
        expect(printedStrings).toEqual(["hello", "world"]);
      });
    });
  });

  // tests/persistent_stack_tests.ts
  var { describeNamed: describeNamed7 } = TestHelpers;
  describeNamed7({ PersistentStack }, () => {
    it("pushes a new element and reports as not empty", () => {
      const s = PersistentStack.make(() => "a");
      s.push();
      expect(s.isEmpty()).not.toBeTruthy();
    });
    it("pushes a new element and returns that new element", () => {
      const s = PersistentStack.make(() => "a");
      expect(s.push()).toEqual("a");
    });
    it("popping an element on a one sized stack, produces an empty stack", () => {
      const s = PersistentStack.make(() => "a");
      s.push();
      s.pop();
      expect(s.isEmpty()).toBeTruthy();
    });
    it("persists old values of a stack even after being popped", () => {
      const s = PersistentStack.make(() => ({ e: 1 }));
      s.push().e = 10;
      s.pop();
      expect(s.push()?.e).toEqual(10);
    });
  });

  // tests/tokenization_tests.ts
  var { describeNamed: describeNamed8 } = TestHelpers;
  describeNamed8({ Tokenization }, () => {
    const getTokens = (inp) => {
      const strings = [];
      const range = Tokenization.make().tokenize(inp);
      TokenRange.forEachIn(range, (str) => strings.push(str));
      return strings;
    };
    it("splits a hello world program", () => {
      expect(getTokens("puts('hello')")).toEqual(["puts", "(", "'hello'", ")"]);
    });
    describe("operators", () => {
      [
        [":==", [":=", "="]],
        ["===", ["=", "=", "="]],
        ["n := p", ["n", ":=", "p"]],
        ["n:=p", ["n", ":=", "p"]],
        ["n=p", ["n", "=", "p"]]
      ].forEach((pair) => {
        const [toSplit, expectedSplit] = pair;
        it(`splits "${toSplit}" correctly`, () => {
          expect(getTokens(toSplit)).toEqual(expectedSplit);
        });
      });
    });
    describe("whitespace", () => {
      [
        ["new lines", "a\nb\n\nc", ["a", "\n", "b", "\n\n", "c"]],
        [
          "spaces",
          "puts ('hello',   'world')  ",
          ["puts", "(", "'hello'", ",", "'world'", ")"]
        ],
        ["mixed with tabs", "n	:= 	p", ["n", ":=", "p"]]
      ].forEach((tuple) => {
        const [desc, toSplit, expectedSplit] = tuple;
        it(`splits "${desc}" correctly`, () => {
          expect(getTokens(toSplit)).toEqual(expectedSplit);
        });
      });
    });
  });

  // tests/tokenization/character_class_tests.ts
  var { describeNamed: describeNamed9 } = TestHelpers;
  describeNamed9({ CharacterClass }, () => {
    describe(".classOf", () => {
      const { classOfString, classes } = CharacterClass;
      it("numeric", () => {
        expect(classOfString("1")).toEqual(classes.numeric);
      });
      it("alphabetic", () => {
        expect(classOfString("q")).toEqual(classes.alphabetic);
      });
      it("operative", () => {
        expect(classOfString(",")).toEqual(classes.operative);
      });
      it("spacious", () => {
        expect(classOfString("	")).toEqual(classes.spacious);
      });
      it("new line", () => {
        expect(classOfString("\n")).toEqual(classes.newLine);
      });
    });
  });

  // tests/tokenization/character_crawler_tests.ts
  var { describeNamed: describeNamed10 } = TestHelpers;
  describeNamed10({ CharacterCrawler }, () => {
    it('crawls an operator ":="', () => {
      const crawler = CharacterCrawler.make(":=");
      const token = crawler.crawl().readToken().content();
      expect(token).toEqual(":=");
    });
    it("skips whitespace", () => {
      const crawler = CharacterCrawler.make("   :=");
      const token = crawler.crawl().readToken().content();
      expect(token).toEqual(":=");
    });
    it("treats trailing whitespace as having reached the end", () => {
      const crawler = CharacterCrawler.make("a  ");
      crawler.crawl().readToken();
      expect(crawler.reachedEnd()).toBeTruthy();
    });
    it("crawls through the next token", () => {
      const crawler = CharacterCrawler.make("puts('hello')");
      const token = crawler.crawl().crawl().readToken().content();
      expect(token).toEqual("(");
    });
    it("crawls through a compact operative statement", () => {
      const crawler = CharacterCrawler.make("a*b");
      const opString = crawler.crawl().crawl().readToken().content();
      expect(opString).toEqual("*");
    });
  });

  // tests/tokenization/crawl_strategies_tests.ts
  var { describeNamed: describeNamed11 } = TestHelpers;
  describeNamed11({ CrawlStrategies }, () => {
    const { alphabetic, literal, operative, spacious } = CharacterClass.classes;
    const crawlAlphanumeric = CrawlStrategies[alphabetic];
    const crawlOperator = CrawlStrategies[operative];
    const crawlStringLiteral = CrawlStrategies[literal];
    const crawlSpace = CrawlStrategies[spacious];
    describeNamed11({ crawlAlphanumeric }, () => {
      [
        ["asdf", "end"],
        ["asdf ", "spaces"],
        ["asdf=", "operators"],
        ["asdf'", "quotations"],
        ["asdf\n", "new line"]
      ].forEach((pair) => {
        const [test, desc] = pair;
        it(`stops at ${desc}`, () => {
          expect(crawlAlphanumeric(test, 0)).toEqual(4);
        });
      });
      it("stops at end with numbers", () => {
        const str = "asdf123";
        expect(crawlAlphanumeric(str, 0)).toEqual(str.length);
      });
    });
    describeNamed11({ crawlOperator }, () => {
      [
        [":=", "re-assignable", 2],
        ["= ", "assignment", 1],
        ["+=", "accumulate", 2],
        ["==", "two assignments", 1],
        [",,", "commas", 1],
        ["((", "parens", 1]
      ].forEach((tuple) => {
        const [test, desc, expected] = tuple;
        it(`crawls out a: ${desc}`, () => {
          expect(crawlOperator(test, 0)).toEqual(expected);
        });
      });
    });
    describeNamed11({ crawlSpace }, () => {
      [
        ["  a", "alphabetic"],
        ["  ", "end"],
        ["	\r=", "at operator with other whitespace"],
        ["  +", "operator"],
        ["  1", "numeric"],
        ["  \n", "new line"]
      ].forEach((pair) => {
        const [test, desc] = pair;
        it(`stops at ${desc}`, () => {
          expect(crawlSpace(test, 0)).toEqual(2);
        });
      });
    });
    describeNamed11({ crawlStringLiteral }, () => {
      it(`crawls stopping at nothing but another "'"`, () => {
        const str = `'hello {" \\\\''`;
        const end = crawlStringLiteral(str, 0);
        expect(str.substring(0, end)).toEqual(`'hello {" \\\\'`);
      });
    });
  });

  // src/ast_validator.ts
  var { freeze: freeze37, memoize: memoize16 } = Helpers;
  var ErrorsCollector = freeze37({
    make: () => {
      const mErrors = [];
      return freeze37({
        pushMessage: (message) => {
          mErrors.push({ message });
        },
        errors: () => mErrors
      });
    }
  });
  var AstLetBinaryOperatorValidatorVisitor = freeze37({
    make: (mContext, mGeneralValidator, mErrorsCollector) => {
      const visitor = AstNodeVisitorBuilder.makeDefaultingToStop().visitBinaryOperation((node, lhs, rhs) => {
        if (node.operation() !== ":=") {
          mErrorsCollector.pushMessage(`Cannot use operator "${node.operation()}" in a let declaration`);
          return;
        }
        if (lhs.type() !== AstNode.types.identifier) {
          mErrorsCollector.pushMessage(`Cannot use ${AstNode.typeToString(lhs.type())} to name a variable`);
          return;
        }
        const declaredVar = mContext.declareVariable(lhs.asString());
        rhs.visit(mGeneralValidator);
        if (mGeneralValidator.errors().length > 0) {
          return;
        }
        if (rhs.type() === AstNode.types.tuple || rhs.type() === AstNode.types.functionCall) {
          mErrorsCollector.pushMessage(`Cannot deduce type of ${AstNode.typeToString(rhs.type())} node`);
          return;
        }
        const typeRes = rhs.executionType(mContext);
        const rhsType = typeRes.resolve();
        if (rhsType) {
          declaredVar.setType(rhsType);
          return;
        }
        mErrorsCollector.pushMessage(typeRes.error().message);
      }).finish();
      return freeze37({
        ...visitor,
        errors: mErrorsCollector.errors
      });
    }
  });
  var AstGeneralValidator = freeze37({
    make: (mContext, mErrorsCollector, mGetMemoizedLetValidator) => {
      const visitor = AstNodeVisitorBuilder.makeDefaultingToStop().visitFunctionCall((_0) => {
        throw Error("unimplemented");
      }).visitBinaryOperation((binNode, _2, _3) => {
        const typeRes = binNode.executionType(mContext);
        const type = typeRes.resolve();
        if (type) {
          return;
        }
        mErrorsCollector.pushMessage(typeRes.error().message);
      }).visitLetDeclaration((node, _1) => {
        node.visit(mGetMemoizedLetValidator());
      }).visitIdentifier((node) => {
        const typeRes = node.executionType(mContext);
        const type = typeRes.resolve();
        if (type) {
          return;
        }
        mErrorsCollector.pushMessage(typeRes.error().message);
      }).visitTuple((node) => node.forEach((node2) => {
        node2.visit(visitor);
      })).finish();
      return freeze37({
        ...visitor,
        errors: mErrorsCollector.errors
      });
    }
  });
  var AstLetsValidatorVisitor = freeze37({
    make: (mBinaryOperatorVisitor, mErrorsCollector) => {
      const visitor = AstNodeVisitorBuilder.makeDefaultingToStop().visitLetDeclaration((_0, node) => {
        if (node.type() !== AstNode.types.binaryOperator) {
          mErrorsCollector.pushMessage(`Cannot declare using a(n) ${AstNode.typeToString(node.type())}`);
          return;
        }
        node.visit(mBinaryOperatorVisitor);
      }).finish();
      return freeze37({
        ...visitor,
        errors: mErrorsCollector.errors
      });
    }
  });
  var AstValidator = freeze37({
    make: (mContext = ExecutionContext.make(), mErrorsCollector = ErrorsCollector.make()) => {
      const mGeneralValidator = AstGeneralValidator.make(
        mContext,
        mErrorsCollector,
        memoize16(() => {
          const binLetVal = AstLetBinaryOperatorValidatorVisitor.make(mContext, mGeneralValidator, mErrorsCollector);
          return AstLetsValidatorVisitor.make(binLetVal, mErrorsCollector);
        })
      );
      return freeze37({
        validate: (node) => {
          node.visit(mGeneralValidator);
          return mErrorsCollector.errors();
        }
      });
    }
  });

  // tests/ast_validator_tests.ts
  var { describeNamed: describeNamed12 } = TestHelpers;
  describeNamed12({ AstValidator }, () => {
    function validateAsTuple(node, validator) {
      const topTupleNode = AstTupleNode.make(",", [node]);
      return validator.validate(topTupleNode);
    }
    it("Cannot find function call for binary operator", () => {
      const validator = AstValidator.make();
      const intNode = AstIntegerLiteralNode.make("1");
      const strNode = AstStringLiteralNode.make("'hello'");
      const topBinNode = AstBinaryOperatorNode.make("+", intNode, strNode);
      const errors = validateAsTuple(topBinNode, validator);
      expect(errors).toEqual([{ message: 'Could not resolve function call for "+"' }]);
    });
    it("cannot use an undefined variable", () => {
      const validator = AstValidator.make();
      const idNode = AstIdentifierNode.make("name");
      const strNode = AstStringLiteralNode.make("'hello'");
      const topBinNode = AstBinaryOperatorNode.make("+", idNode, strNode);
      const errors = validateAsTuple(topBinNode, validator);
      expect(errors).toEqual([{ message: 'Undeclared variable "name"' }]);
    });
    it("cannot use an identifier (alone) to declare a variable", () => {
      const validator = AstValidator.make();
      const idNode = AstIdentifierNode.make("name");
      const topLetNode = AstLetDeclarationNode.make(idNode);
      const errors = validateAsTuple(topLetNode, validator);
      expect(errors).toEqual([{ message: "Cannot declare using a(n) identifier" }]);
    });
    it('cannot use a "+" to declare a variable', () => {
      const validator = AstValidator.make();
      const idNode = AstIdentifierNode.make("name");
      const strNode = AstStringLiteralNode.make("'hello'");
      const binNode = AstBinaryOperatorNode.make("+", idNode, strNode);
      const topLetNode = AstLetDeclarationNode.make(binNode);
      const errors = validateAsTuple(topLetNode, validator);
      expect(errors).toEqual([{ message: 'Cannot use operator "+" in a let declaration' }]);
    });
    it("cannot use a string literal (directly) to name a variable", () => {
      const validator = AstValidator.make();
      const strNode = AstStringLiteralNode.make("'hello'");
      const intNode = AstIntegerLiteralNode.make("1");
      const binNode = AstBinaryOperatorNode.make(":=", strNode, intNode);
      const topLetNode = AstLetDeclarationNode.make(binNode);
      const errors = validateAsTuple(topLetNode, validator);
      expect(errors).toEqual([{ message: "Cannot use string literal to name a variable" }]);
    });
    it("a totally valid let declaration, produces no errors", () => {
      const validator = AstValidator.make();
      const idNode = AstIdentifierNode.make("name");
      const strNode = AstStringLiteralNode.make("'hello'");
      const binNode = AstBinaryOperatorNode.make(":=", idNode, strNode);
      const topLetNode = AstLetDeclarationNode.make(binNode);
      const errors = validateAsTuple(topLetNode, validator);
      expect(errors).toEqual([]);
    });
  });

  // tests/ast_build/close_position_retrieval_tests.ts
  var { describeNamed: describeNamed13 } = TestHelpers;
  describeNamed13({ ClosePositionRetrieval }, () => {
    const { make: make3 } = ClosePositionRetrieval;
    const { makeStartingRange } = TokenRange;
    const makeToken = Token.forTesting.makeFromStringOnly;
    const asTokens = (...arr) => arr.map((value) => makeToken(value));
    const asTokenRange = (...arr) => {
      return makeStartingRange(asTokens(...arr));
    };
    const makeFromTokens = (...arr) => {
      const range = asTokenRange(...arr);
      const head = range.tokenAt(0);
      return make3(range.step(), head);
    };
    it("()", () => {
      const retr = makeFromTokens("(", ")");
      expect(retr.closePosition()).toEqual(1);
    });
    it("( <some other token> )", () => {
      const retr = makeFromTokens("(", "a", ")");
      expect(retr.closePosition()).toEqual(2);
    });
    it("( <many tokens> )", () => {
      const retr = makeFromTokens("(", "a", "b", "a", "l", ")");
      expect(retr.closePosition()).toEqual(5);
    });
    it('"(" errors', () => {
      const retr = makeFromTokens("(");
      expect(retr.closePosition()).not.toBeDefined();
      expect(retr.error().message).toEqual("Cannot find close position for (");
    });
    it("(())", () => {
      const retr = makeFromTokens("(", "(", ")", ")");
      expect(retr.closePosition()).toEqual(3);
    });
    it("( <some token> ())", () => {
      const retr = makeFromTokens("(", "a", "(", ")", ")");
      expect(retr.closePosition()).toEqual(4);
    });
    it("(()())", () => {
      const retr = makeFromTokens("(", "(", ")", "(", ")", ")");
      expect(retr.closePosition()).toEqual(5);
    });
    it("((())()))", () => {
      const retr = makeFromTokens(
        "(",
        "(",
        "(",
        ")",
        ")",
        "(",
        ")",
        ")",
        ")"
      );
      expect(retr.closePosition()).toEqual(7);
    });
  });

  // tests/operative_statement_builder_tests.ts
  var { describeNamed: describeNamed14 } = TestHelpers;
  describeNamed14({ OperativeStatementBuilder }, () => {
    const { binary, unary } = OperatorDefinitions.operandRelationships;
    const operatorToOperandRelationMap = Object.freeze({
      ["+"]: binary,
      ["*"]: binary,
      [","]: binary,
      ["let"]: unary,
      [":="]: binary
    });
    const makeToken = Token.forTesting.makeFromStringOnly;
    const makeCompletion = (tokens) => OperativeStatementBuilder.makeFromTokens(tokens, operatorToOperandRelationMap).completion();
    const workCollection = (tokens) => makeCompletion(tokens).rootVisitable();
    const makeTokens = (...arr) => arr.map(makeToken);
    const makeVisitor = (mStackedArr) => {
      const inst = {
        visitToken: (token) => {
          mStackedArr.push(token.content());
        },
        visitNode: (_0) => {
          throw new Error("should not directly add nodes for this test");
        },
        visitLinks: (low, node, high) => {
          node.visit(inst);
          low.visit(inst);
          high.visit(inst);
        }
      };
      return inst;
    };
    it("a + b", () => {
      const res = workCollection(makeTokens("a", "+", "b"));
      const stackedArr = [];
      res?.visit(makeVisitor(stackedArr));
      expect(stackedArr).toEqual(["+", "a", "b"]);
    });
    it("a * b + c", () => {
      const res = workCollection(makeTokens("a", "*", "b", "+", "c"));
      const stackedArr = [];
      res?.visit(makeVisitor(stackedArr));
      expect(stackedArr).toEqual(["+", "*", "a", "b", "c"]);
    });
    it("a + b * c", () => {
      const res = workCollection(makeTokens("a", "+", "b", "*", "c"));
      const stackedArr = [];
      res?.visit(makeVisitor(stackedArr));
      expect(stackedArr).toEqual(["+", "a", "*", "b", "c"]);
    });
    it("a + b * c + d", () => {
      const res = workCollection(makeTokens("a", "+", "b", "*", "c", "+", "d"));
      const stackedArr = [];
      res?.visit(makeVisitor(stackedArr));
      expect(stackedArr).toEqual(["+", "+", "a", "*", "b", "c", "d"]);
    });
    it("a, b + c, d * e + f", () => {
      const res = workCollection(makeTokens(
        "a",
        ",",
        "b",
        "+",
        "c",
        ",",
        "d",
        "*",
        "e",
        "+",
        "f"
      ));
      const stackedArr = [];
      res?.visit(makeVisitor(stackedArr));
      expect(stackedArr).toEqual([",", ",", "a", "+", "b", "c", "+", "*", "d", "e", "f"]);
    });
    it("let a := b", () => {
      const res = workCollection(makeTokens(
        "let",
        "a",
        ":=",
        "b"
      ));
      const stackedArr = [];
      res?.visit(makeVisitor(stackedArr));
      expect(stackedArr).toEqual(["let", ":=", "a", "b"]);
    });
    it("let a := b + c * d", () => {
      const { rootVisitable } = makeCompletion(makeTokens(
        "let",
        "a",
        ":=",
        "b",
        "+",
        "c",
        "*",
        "d"
      ));
      const stackedArr = [];
      rootVisitable()?.visit(makeVisitor(stackedArr));
      expect(stackedArr).toEqual(["let", ":=", "a", "+", "b", "*", "c", "d"]);
    });
    it("a + + a", () => {
      const { rootVisitable, error } = makeCompletion(makeTokens("a", "+", "+", "a"));
      expect(rootVisitable()).toBeUndefined();
      expect(error().message).toEqual('Expression malformed around "+"');
    });
    it("let a 3", () => {
      const { rootVisitable, error } = makeCompletion(makeTokens("let", "a", "3"));
      expect(rootVisitable()).toBeUndefined();
      expect(error().message).toEqual('Expression malformed around "3"');
    });
  });

  // tests/ast_build/fn_close_position_retrieval_tests.ts
  var { describeNamed: describeNamed15 } = TestHelpers;
  describeNamed15({ FnClosePositionRetrieval }, () => {
    const make3 = (...tokenStrings) => {
      const { makeFromStringOnly } = Token.forTesting;
      const range = TokenRange.makeStartingRange(tokenStrings.map(makeFromStringOnly));
      const open = range.startToken();
      return FnClosePositionRetrieval.make(range.step(), open);
    };
    describe('"fn" in isolation', () => {
      const { closePosition } = make3("fn");
      it("is the correct position", () => expect(closePosition()).toEqual(1));
    });
    describe("fn x\ny", () => {
      const { closePosition } = make3("fn", "x", "\n", "y");
      it("is the correct position", () => expect(closePosition()).toEqual(2));
    });
    describe("fn fn x\ny", () => {
      const { closePosition } = make3("fn", "fn", "x", "\n", "y");
      it("is the correct position", () => expect(closePosition()).toEqual(3));
    });
    describe("fn\n  x\n  y", () => {
      const { closePosition } = make3("fn", "\n", "x", "\n", "y");
      it("is the correct position", () => expect(closePosition()).toEqual(5));
    });
    describe("fn\n  x\n~\ny", () => {
      const { closePosition } = make3("fn", "\n", "x", "\n", "~", "\n", "y");
      it("is the correct position", () => expect(closePosition()).toEqual(4));
    });
  });
})();
