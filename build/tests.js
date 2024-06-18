(() => {
  // tests/globals.ts
  globalThis["debug_mode"] = true;

  // src/helpers.ts
  var kDebugMode = globalThis["debug_mode"] ?? false;
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
    const { freeze: freeze28 } = Helpers;
    function make() {
      let mErrorFn = () => {
        throw Error("No error set, this method should not be called");
      };
      function setErrorFn(fn) {
        mErrorFn = fn;
      }
      function setErrorMessage(message) {
        mErrorFn = () => freeze28({ message });
      }
      function error() {
        return mErrorFn();
      }
      return freeze28({ setErrorFn, setErrorMessage, error });
    }
    return freeze28({ make });
  })();
  expose({ Helpers });
  var TypeCheckable = (() => {
    function make() {
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
      make
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
      globalThis[k] = braceEnclosedVar[k];
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
    function make() {
      return construct([0], 0);
    }
    function construct(mSet, mIdx) {
      let mRequiredHits = 1;
      let mName = `Point ${mIdx}`;
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
    return Object.freeze({ make, makeCollection });
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
    function make() {
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
    return freeze2({ make, reservedAnonymouseName });
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
    function make(base) {
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
      make,
      satisfactionDegreeOfParam
    });
  })();

  // src/object_type.ts
  var { freeze: freeze3 } = Helpers;
  var ObjectType = (() => {
    const { memoize: memoize8 } = Helpers;
    const kBuiltInTypeUids = freeze3({
      integer: Symbol(),
      string: Symbol()
    });
    const kUidBuiltinStrategy = freeze3({
      Integer: kBuiltInTypeUids.integer,
      String: kBuiltInTypeUids.string
    });
    function makeUidFor(name) {
      return kUidBuiltinStrategy[name] ?? Symbol();
    }
    function make(name) {
      name ??= "<anonymous>";
      let mLookupTable = {};
      const inst = freeze3({
        lookUp,
        name: () => name,
        uid: makeUidFor(name),
        setLookUp,
        asSingluarParameter: memoize8(asSingluarParameter)
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
    return freeze3({ make, builtInTypeUids: kBuiltInTypeUids });
  })();

  // src/object_look_up_table.ts
  var { freeze: freeze4, memoize: memoize2 } = Helpers;
  var ObjectLookUpTable = (() => {
    const getBuiltinTypes = memoize2(() => {
      const integer_ = ObjectType.make("Integer");
      const string_ = ObjectType.make("String");
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
        Unresolved: ObjectType.make("Unresolved")
      });
    });
    function make() {
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
    return freeze4({ make, getBuiltinTypes });
  })();

  // src/context_variable.ts
  var { freeze: freeze5, registerSymbolStrings } = Helpers;
  var ContextVariable = (() => {
    const kStringAccessors = freeze5({
      asString_: (s) => s,
      asNumber: (_0) => {
        throw Error("not a number");
      }
    });
    const kNumericAccessors = freeze5({
      asString_: (s) => `${s}`,
      asNumber: (s) => s
    });
    const kUninitializedAccessors = (() => {
      const kNotInitializedError = (_0) => {
        throw Error(`not initialized`);
      };
      return freeze5({
        asString_: kNotInitializedError,
        asNumber: kNotInitializedError
      });
    })();
    const kTypes = freeze5({
      integer: Symbol(),
      string: Symbol()
    });
    registerSymbolStrings("ContextVariable", kTypes);
    function make(mValue) {
      const { getBuiltinTypes } = ObjectLookUpTable;
      const kBuiltinTypes = getBuiltinTypes();
      const inst = freeze5({ set, asString, asNumber, type, copyTo, setType });
      let mType = kBuiltinTypes.Unresolved;
      let mAsString = kUninitializedAccessors.asString_;
      let mAsNumber = kUninitializedAccessors.asNumber;
      function set(v) {
        const accessors = (() => {
          if (typeof v === "number") {
            mType = kBuiltinTypes.Integer;
            return kNumericAccessors;
          } else if (typeof v === "string") {
            mType = kBuiltinTypes.String;
            return kStringAccessors;
          } else {
            throw Error(`Cannot handle type "${typeof v}`);
          }
        })();
        mValue = v;
        mAsString = accessors.asString_;
        mAsNumber = accessors.asNumber;
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
      function type() {
        return mType;
      }
      return mValue ? set(mValue) : inst;
    }
    return freeze5({ make, types: kTypes });
  })();

  // src/ast_node.ts
  var { freeze: freeze6 } = Helpers;
  var AstNode = (() => {
    const executionTypes = ContextVariable.types;
    let sStringTable = void 0;
    const class_ = freeze6({
      executionTypes,
      typeToString: (type) => {
        const str = (sStringTable ??= freeze6({
          [class_.types.binaryOperator]: "binary operator",
          [class_.types.tuple]: "tuple",
          [class_.types.stringLiteral]: "string literal",
          [class_.types.identifier]: "identifier",
          [class_.types.letDeclaration]: "declaration",
          [class_.types.integerLiteral]: "integer literal"
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
        integerLiteral: Symbol()
      }
    });
    return class_;
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
    const { freeze: freeze28 } = Helpers;
    const binaryOperatorType = AstNode.types.binaryOperator;
    return freeze28({
      make: (op, lhs, rhs) => {
        const inst = freeze28({
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
          }
        });
        return inst;
      }
    });
  })();

  // src/ast_identifier_node.ts
  var { freeze: freeze8 } = Helpers;
  var AstIdentifierNode = (() => {
    const kIndentifier = AstNode.types.identifier;
    const kOperators = freeze8({
      ",": true,
      "(": true,
      ":=": true,
      "+": true,
      "-": true,
      "*": true
    });
    function make(value) {
      const inst = freeze8({
        comesBeforeOperator: (operator) => !!kOperators[operator.content()],
        executionType: (types) => types.lookUpIdentifierType(value),
        evaluate: (getter) => getter(value),
        type: () => kIndentifier,
        asString: () => value,
        visit: (visitor) => visitor.visitIdentifier(inst)
      });
      return inst;
    }
    return freeze8({ make });
  })();

  // src/ast_node_visitor.ts
  var { freeze: freeze9 } = Helpers;
  var AstNodeVisitorBuilder = (() => {
    function makeContinuingImplementations() {
      let mCurrentInst = freeze9({
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
        setInstanceReference: (inst) => {
          mCurrentInst = inst;
          return inst;
        }
      });
      return mCurrentInst;
    }
    const kStoppingImplementations = (() => {
      const inst = freeze9({
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
        setInstanceReference: (passedInst) => passedInst
      });
      return inst;
    })();
    const class_ = freeze9({
      makeDefaultingToStop: () => class_.make(kStoppingImplementations),
      makeDefaultingToContinue: () => class_.make(makeContinuingImplementations()),
      make: (mImplementations) => {
        let mVisitBinaryOperation = mImplementations.visitBinaryOperation;
        let mVisitFunctionCall = mImplementations.visitFunctionCall;
        let mVisitLetDeclaration = mImplementations.visitLetDeclaration;
        let mVisitIdentifier = mImplementations.visitIdentifier;
        let mVisitTuple = mImplementations.visitTuple;
        const inst = freeze9({
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
          finish: () => {
            const inst2 = freeze9({
              visitBinaryOperation: mVisitBinaryOperation,
              visitFunctionCall: mVisitFunctionCall,
              visitLetDeclaration: mVisitLetDeclaration,
              visitIdentifier: mVisitIdentifier,
              visitTuple: mVisitTuple
            });
            return mImplementations.setInstanceReference(inst2);
          }
        });
        return inst;
      }
    });
    return class_;
  })();

  // tests/ast_binary_operator_node_tests.ts
  var { describeNamed: describeNamed2 } = TestHelpers;
  describeNamed2({ AstBinaryOperatorNode }, () => {
    const { make } = AstBinaryOperatorNode;
    const makeIdentifier = AstIdentifierNode.make;
    it("is reachable by visitor", () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitBinaryOperation((_0, _1, _2) => {
        hitsAtExactly(1);
      }).finish();
      make(":=", makeIdentifier(""), makeIdentifier("")).visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });
    it("reports self as a binary operator node type", () => {
      const type = make(":=", makeIdentifier(""), makeIdentifier("")).type();
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
      make(":=", makeIdentifier("foo"), makeIdentifier("")).visit(visitor);
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
        const node = make("foo", makeIdentifier(""), makeIdentifier(""));
        const exres = node.executionType(a);
        const extype = exres.resolve();
        expect(extype?.uid).toEqual(sampleReturnType.uid);
      });
    });
  });

  // src/tokenization/character_class.ts
  var CharacterClass = (() => {
    const { freeze: freeze28 } = Helpers;
    function safeOneCharJumpTable(charsPairs) {
      const arr = [];
      charsPairs.forEach((pair) => {
        if (pair[0])
          arr[pair[0]] = pair[1];
      });
      return arr;
    }
    const classes = freeze28({
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
          "}"
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
    return freeze28({
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
    const { freeze: freeze28 } = Object;
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
    return freeze28({
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
    const { freeze: freeze28 } = Object;
    const injections2 = freeze28({
      CrawlStrategies,
      characterClassOf: CharacterClass.classOfString,
      characterClasses: CharacterClass.classes
    });
    function make(mInput, { CrawlStrategies: CrawlStrategies2, characterClassOf, characterClasses } = injections2) {
      const inst = freeze28({ reachedEnd, readToken, crawl });
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
    return freeze28({ make });
  })();

  // src/token_range.ts
  var { freeze: freeze10, verifyInTesting: verifyInTesting2 } = Helpers;
  var TokenRange = (() => {
    function makeStartingRange(mTokens) {
      return make(mTokens, 0, mTokens.length);
    }
    function forEachIn(tokenRange, fn) {
      const { start, end } = tokenRange;
      const rangeEnd = end();
      for (let i = start(); i < rangeEnd; ++i) {
        fn(tokenRange.tokenAt(i).content());
      }
    }
    function make(mTokens, mStart, mEnd) {
      const kNewLineType = Token.types.newLine;
      const inst = freeze10({
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
        clone: (start, end) => make(mTokens, start ?? mStart, end ?? mEnd),
        tokenAt: (i) => mTokens[i],
        start: () => mStart,
        end: () => mEnd,
        isEmpty: () => mStart === mEnd,
        startToken: () => mTokens[mStart],
        range: () => {
          verifyInTesting2();
          return freeze10({ start: mStart, end: mEnd });
        }
      });
      function _verifyValidRange() {
        const { length } = mTokens;
        if (mStart > mEnd) {
          throw Error(`Range start ${mStart} must be less than or equal to end ${mEnd}`);
        } else if (length < mEnd) {
          throw Error(`Range end ${mEnd} cannot exceed token count ${length}`);
        }
        return inst;
      }
      return _verifyValidRange();
    }
    return freeze10({ make, makeStartingRange, forEachIn });
  })();

  // src/tokenization.ts
  var Tokenization = (() => {
    const { freeze: freeze28 } = Helpers;
    const injections2 = freeze28({ CharacterCrawler, TokenRange });
    const getCharacterClassToTokenTypeMap = /* @__PURE__ */ (() => {
      function makeCharacterClassToTokenTypeMap() {
        const { classes } = CharacterClass;
        const { types } = Token;
        return freeze28({
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
    return freeze28({
      make: ({ CharacterCrawler: CharacterCrawler2, TokenRange: TokenRange2 } = injections2) => freeze28({
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
  var { freeze: freeze11 } = Object;
  var Token = (() => {
    const types = freeze11({
      // declareFunction: Symbol(), // ???
      operator: Symbol(),
      newLine: Symbol(),
      grouping: Symbol(),
      identifier: Symbol(),
      stringLiteral: Symbol(),
      integerLiteral: Symbol()
    });
    const kBlankToken = (() => {
      function unimplemented(desc) {
        return () => {
          throw Error(`Cannot call ${desc} unimplemented`);
        };
      }
      return freeze11({
        type: unimplemented("type"),
        // TODO: try to get rid of this hack, blank token should
        // never be used
        content: () => "",
        start: unimplemented("start"),
        end: unimplemented("end")
      });
    })();
    const tokenTypeOf = (() => {
      const kControlSeqs = freeze11({
        ["let"]: types.operator,
        // ['fn' ]: types.declareFunction,
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
      return freeze11({
        content: () => mTokenContent,
        start: () => mStart,
        end: () => mEnd,
        type: () => mType ??= tokenTypeOf(mTokenContent)
      });
    }
    return freeze11({
      make: (mInput, mStart, mEnd) => construct(mInput.substring(mStart, mEnd), mStart, mEnd),
      types,
      kBlankToken,
      forTesting: { makeFromStringOnly }
    });
  })();

  // src/ast_let_declaration_node.ts
  var { freeze: freeze12 } = Helpers;
  var AstLetDeclarationNode = freeze12({
    make: (node) => {
      const { executionType } = node;
      const { letDeclaration } = AstNode.types;
      const inst = freeze12({
        visit: (visitor) => {
          visitor.visitLetDeclaration(inst, node);
        },
        type: () => letDeclaration,
        executionType: (types) => {
          return executionType(types);
        }
      });
      return inst;
    }
  });
  var AstIncompleteUnaryNode = (() => {
    function _selectedConstructor(operatorStr) {
      switch (operatorStr) {
        case "let":
          return AstLetDeclarationNode.make;
        default:
          break;
      }
      throw Error(`Token ${operatorStr} does not result in an unary operator`);
    }
    function makeForOperator(operatorStr) {
      return make(_selectedConstructor(operatorStr));
    }
    function make(fn) {
      return freeze12({ finish: fn });
    }
    return freeze12({ makeForOperator });
  })();

  // src/ast_tuple_node.ts
  var AstTupleNode = (() => {
    const { freeze: freeze28, memoize: memoize8 } = Helpers;
    const tupleType = AstNode.types.tuple;
    function makeWithPair(lhs, rhs) {
      const mSubExpressions = [lhs];
      const inst = class_.make(mSubExpressions);
      if (rhs && inst.consume(rhs)) {
        mSubExpressions.push(rhs);
      }
      return inst;
    }
    const class_ = freeze28({
      makeEmpty: () => memoize8(() => class_.make([]))(),
      makeBinary: (_0, lhs, rhs) => makeWithPair(lhs, rhs),
      makeUnary: (lhs) => makeWithPair(lhs, void 0),
      make: (mSubExpressions) => {
        const inst = freeze28({
          forEach: (fn) => mSubExpressions.forEach((node) => fn(node)),
          count: () => mSubExpressions.length,
          visit: (visitor) => visitor.visitTuple(inst),
          type: () => tupleType,
          consume: (node) => {
            if (node.type() !== tupleType) {
              return node;
            }
            node.forEach((subNode) => {
              mSubExpressions.push(subNode);
            });
            return void 0;
          },
          executionType: (_0) => {
            throw Error(`AstTupleNode does not implement executionType`);
          }
        });
        return inst;
      }
    });
    return class_;
  })();

  // src/ast_function_call_node.ts
  var AstFunctionCallNode = (() => {
    const nodeTypes = AstNode.types;
    function make(_0, lhs, rhs) {
      const arguments_ = (() => {
        if (rhs.type() === nodeTypes.tuple) {
          return rhs;
        }
        return AstTupleNode.makeUnary(rhs);
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
        arguments: arguments_,
        visit,
        type: () => nodeTypes.functionCall,
        executionType: (_02) => {
          throw Error("executionType is not implemented for function call nodes");
        }
      });
      function visit(visitor) {
        visitor.visitFunctionCall(inst);
      }
      return inst;
    }
    return Object.freeze({ make });
  })();

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
    function make(value) {
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
    return freeze13({ make, valueOf });
  })();

  // src/ast_string_literal_node.ts
  var { freeze: freeze14, memoize: memoize4 } = Helpers;
  var AstStringLiteralNode = (() => {
    const kStringLiteral = AstNode.types.stringLiteral;
    function make(mValue) {
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
    return freeze14({ make });
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

  // src/ast_incomplete_binary_node.ts
  var { freeze: freeze16 } = Helpers;
  var AstIncompleteBinaryNode = (() => {
    function make(fn, operatorStr, lhs) {
      function finish(rhs) {
        return fn(operatorStr, lhs, rhs);
      }
      function lhsAsString() {
        if (!AstFringeNode.hasCreated(lhs)) {
          return void 0;
        }
        return AstFringeNode.downcast(lhs).asString();
      }
      return freeze16({ finish, lhsAsString });
    }
    return freeze16({ make });
  })();

  // src/ast_build/incomplete_binary_node_creation.ts
  var { freeze: freeze17 } = Helpers;
  var IncompleteBinaryNodeCreation = (() => {
    const { error, setErrorMessage } = StandardError.make();
    let sConstructorTable = void 0;
    function make(mOperator, mLhs) {
      function _selectedConstructor() {
        sConstructorTable ??= freeze17({
          [","]: AstTupleNode.makeBinary,
          ["\n"]: AstTupleNode.makeBinary,
          [":="]: AstBinaryOperatorNode.make,
          ["+"]: AstBinaryOperatorNode.make,
          ["-"]: AstBinaryOperatorNode.make,
          ["*"]: AstBinaryOperatorNode.make,
          // not a keyword
          ["call"]: AstFunctionCallNode.make
        });
        const tokenStr = mOperator.content();
        const selected = sConstructorTable[tokenStr];
        if (selected) {
          return selected;
        }
        return setErrorMessage(
          `Token ${tokenStr} does not result in a binary operator`
        );
      }
      function makeNode() {
        const selected = _selectedConstructor();
        if (!selected) {
          return;
        }
        return AstIncompleteBinaryNode.make(selected, mOperator.content(), mLhs);
      }
      return freeze17({ makeNode, error });
    }
    return freeze17({ make });
  })();

  // src/ast_build/close_position_retrieval.ts
  var { freeze: freeze18, memoize: memoize5 } = Helpers;
  var kCloseMapping = freeze18({
    ["("]: ")"
  });
  var ClosePositionRetrieval = (() => {
    return freeze18({
      make: (mTokenRange, mGroupOpen) => {
        const { error, setErrorMessage } = StandardError.make();
        const { tokenAt, start, end } = mTokenRange;
        const closeMapping = () => {
          const { content } = mGroupOpen;
          return kCloseMapping[content()] ?? (() => {
            throw Error(`Unhandled opening "${content()}"`);
          });
        };
        return freeze18({
          closePosition: memoize5(() => {
            const closeStr = closeMapping();
            const count = end();
            for (let i = start(); i < count; ++i) {
              if (tokenAt(i).content() === closeStr) {
                return i;
              }
            }
            return setErrorMessage(
              `Cannot find close position for ${mGroupOpen.content()}`
            );
          }),
          error
        });
      }
    });
  })();

  // src/ast_build/start_group_build.ts
  var { freeze: freeze19, memoize: memoize6 } = Helpers;
  var StartGroupBuild = freeze19({
    makeBuildAdditionWithIncomplete: (mTokenRange, mGroupOpen, mIncompleteNode) => {
      if (mTokenRange.isEmpty()) {
        throw Error("must check for empty range");
      }
      const nextPart = StartGroupBuild.make(mTokenRange, mGroupOpen);
      return BuildStateAddition.make((sink) => {
        sink.pushIncomplete(mIncompleteNode).pushPart(nextPart);
      });
    },
    // assumption: token range starts one after the group open token
    make: (mTokenRange, mGroupOpen) => {
      const {
        error,
        closePosition
      } = ClosePositionRetrieval.make(mTokenRange, mGroupOpen);
      const { start, end } = mTokenRange;
      const leftPartRange = () => mTokenRange.clone(start(), closePosition());
      const rightPartStart = () => Math.min(closePosition() + 1, end());
      const rightPartRange = memoize6(() => mTokenRange.clone(rightPartStart(), end()).skipNewLine());
      const makePart = TreePartBuild.make;
      return freeze19({
        build: () => {
          if (!closePosition())
            return;
          const leftPart = makePart(leftPartRange());
          return BuildStateAddition.make((sink) => {
            if (!rightPartRange().isEmpty()) {
              sink.pushPart(makePart(rightPartRange()));
            }
            sink.pushPart(leftPart);
          });
        },
        error,
        range: mTokenRange.range
      });
    }
  });

  // src/ast_build/continuing_after_operator_build.ts
  var ContinuingAfterOperatorBuild = (() => {
    const { freeze: freeze28 } = Helpers;
    const kTokenTypes2 = Token.types;
    return freeze28({
      make: (mTokenRange, mIncompleteNode) => {
        const { error, setErrorMessage } = StandardError.make();
        const { startToken } = mTokenRange;
        const handlePeekAheadFringe = () => {
          const fringeNode = AstFringeNode.makeForToken(startToken());
          const nextPart = ContinuingAfterFringeBuild.make(mTokenRange.step(), fringeNode, mIncompleteNode);
          return BuildStateAddition.make((sink) => {
            sink.pushPart(nextPart);
          });
        };
        const kPeakAheadStrategies = freeze28({
          [kTokenTypes2.identifier]: handlePeekAheadFringe,
          [kTokenTypes2.integerLiteral]: handlePeekAheadFringe,
          [kTokenTypes2.stringLiteral]: handlePeekAheadFringe,
          [kTokenTypes2.newLine]: () => {
            mTokenRange.skipNewLine();
            return kPeakAheadStrategies[startToken().type()]();
          },
          [kTokenTypes2.grouping]: () => {
            const start_ = startToken();
            mTokenRange.step();
            if (mTokenRange.isEmpty()) {
              return setErrorMessage("unexpected end after operator");
            }
            return StartGroupBuild.makeBuildAdditionWithIncomplete(
              mTokenRange,
              start_,
              mIncompleteNode
            );
          },
          [kTokenTypes2.operator]: () => setErrorMessage(`Post operator two consecutive fringe nodes not allowed (unary nesting unimplemented)`)
        });
        return freeze28({
          error,
          build: () => {
            if (mTokenRange.isEmpty()) {
              return setErrorMessage("unexpected end of input");
            }
            return kPeakAheadStrategies[startToken().type()]();
          },
          range: mTokenRange.range
        });
      }
    });
  })();

  // src/ast_build/continuing_after_fringe_build.ts
  var { freeze: freeze20 } = Helpers;
  var kTokenTypes = Token.types;
  var ContinuingAfterFringeBuild = freeze20({
    make: (mTokenRange, mFringeNode, mIncompleteNode) => {
      const { error, setErrorMessage, setErrorFn } = StandardError.make();
      const { startToken } = mTokenRange;
      const handleFringeNext = () => setErrorMessage(`Post operator two consecutive fringe nodes not allowed`);
      const kNextTokenStrategies = freeze20({
        [kTokenTypes.identifier]: handleFringeNext,
        [kTokenTypes.stringLiteral]: handleFringeNext,
        [kTokenTypes.integerLiteral]: handleFringeNext,
        [kTokenTypes.grouping]: () => {
          if (mTokenRange.isEmpty()) {
            return BuildStateAddition.make((sink) => {
              sink.pushComplete(mIncompleteNode.finish(mFringeNode));
            });
          }
          return StartGroupBuild.makeBuildAdditionWithIncomplete(
            mTokenRange,
            startToken(),
            mIncompleteNode
          );
        },
        [kTokenTypes.operator]: () => {
          const creation = IncompleteBinaryNodeCreation.make(startToken(), mFringeNode);
          const nextIncomplete = creation.makeNode();
          if (!nextIncomplete) {
            return setErrorFn(creation.error);
          }
          const nextPart = ContinuingAfterOperatorBuild.make(mTokenRange.step(), nextIncomplete);
          return BuildStateAddition.make((sink) => {
            sink.pushIncomplete(mIncompleteNode).pushPart(nextPart);
          });
        },
        [kTokenTypes.newLine]: () => {
          return BuildStateAddition.make((sink) => {
            sink.pushComplete(mIncompleteNode.finish(mFringeNode));
            if (!mTokenRange.skipNewLine().isEmpty()) {
              sink.pushPart(TreePartBuild.make(mTokenRange));
            }
          });
        }
      });
      const inst = freeze20({
        build: () => {
          const byType = startToken()?.type() ?? kTokenTypes.newLine;
          return kNextTokenStrategies[byType]();
        },
        error,
        range: mTokenRange.range
      });
      return inst;
    }
  });

  // src/ast_build/start_unary_operator_build.ts
  var StartUnaryOperatorBuild = (() => {
    const { freeze: freeze28 } = Helpers;
    const kTokenTypes2 = Token.types;
    return freeze28({
      make: (mTokenRange, mOperatorToken) => {
        const { error, setErrorMessage } = StandardError.make();
        const { startToken, range } = mTokenRange;
        function switchToFringe() {
          const startNode_ = AstFringeNode.makeForToken(startToken());
          const nextRange = mTokenRange.step();
          const incompleteNode = AstIncompleteUnaryNode.makeForOperator(mOperatorToken.content());
          const part = ContinuingAfterFringeBuild.make(nextRange, startNode_, incompleteNode);
          return BuildStateAddition.make((sink) => {
            sink.pushPart(part);
          });
        }
        const kTokenTypeHandlers = freeze28({
          [kTokenTypes2.identifier]: switchToFringe,
          [kTokenTypes2.stringLiteral]: switchToFringe,
          [kTokenTypes2.integerLiteral]: switchToFringe,
          [kTokenTypes2.grouping]: () => setErrorMessage(`Cannot start group after an unary operator (yet!)`),
          [kTokenTypes2.operator]: () => setErrorMessage(`An operator cannot follow another`),
          [kTokenTypes2.newLine]: () => {
            mTokenRange.skipNewLine();
            return inst.build();
          }
        });
        const inst = freeze28({
          build: () => {
            if (mTokenRange.isEmpty()) {
              return setErrorMessage("unexpected end of input");
            }
            return kTokenTypeHandlers[startToken().type()]();
          },
          error,
          range
        });
        return inst;
      }
    });
  })();

  // src/ast_build/start_fringe_build.ts
  var { freeze: freeze21 } = Helpers;
  var StartFringeBuild = (() => {
    const kTokenTypes2 = Token.types;
    const kCallToken = Token.forTesting.makeFromStringOnly("call");
    return freeze21({
      make: (mFringeToken, mTokenRange) => {
        const { error, setErrorMessage, setErrorFn } = StandardError.make();
        const { startToken } = mTokenRange;
        function handleFringe() {
          return setErrorMessage(
            `Cannot follow "${mFringeToken.content()}" with "${startToken().content()}"`
          );
        }
        function fringeNode() {
          return AstFringeNode.makeForToken(mFringeToken);
        }
        function makeIncompleteNode(token) {
          const { makeNode, error: error2 } = IncompleteBinaryNodeCreation.make(token, fringeNode());
          return makeNode() ?? setErrorFn(error2);
        }
        function buildFringeWithRangeAsNewPart() {
          const fnode = fringeNode();
          return BuildStateAddition.make((sink) => {
            sink.pushComplete(fnode);
            if (!mTokenRange.isEmpty()) {
              sink.pushPart(TreePartBuild.make(mTokenRange));
            }
          });
        }
        function handleOperator(token) {
          const incompleteNode = makeIncompleteNode(token);
          if (!incompleteNode)
            return;
          const afterOpBuild = ContinuingAfterOperatorBuild.make(mTokenRange, incompleteNode);
          return BuildStateAddition.make((sink) => {
            sink.pushPart(afterOpBuild);
          });
        }
        const priv = freeze21({
          [kTokenTypes2.identifier]: handleFringe,
          [kTokenTypes2.stringLiteral]: handleFringe,
          [kTokenTypes2.integerLiteral]: handleFringe,
          [kTokenTypes2.grouping]: () => handleOperator(kCallToken),
          [kTokenTypes2.operator]: () => {
            const start_ = startToken();
            mTokenRange.step();
            return handleOperator(start_);
          },
          [kTokenTypes2.newLine]: () => {
            mTokenRange.step();
            return buildFringeWithRangeAsNewPart();
          }
        });
        return freeze21({
          build: () => {
            if (mTokenRange.isEmpty()) {
              return buildFringeWithRangeAsNewPart();
            }
            return priv[startToken().type()]();
          },
          error
        });
      }
    });
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
    function make(mTokenRange) {
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
          const { build, error: error2 } = StartUnaryOperatorBuild.make(mTokenRange.step(), start);
          return build() ?? setErrorFn(error2);
        },
        [kTokenTypes2.newLine]: () => {
          mTokenRange.skipNewLine();
          return inst.build();
        }
      });
      const inst = freeze22({
        build: () => {
          if (mTokenRange.isEmpty()) {
            return BuildStateAddition.make((sink) => {
              sink.pushComplete(AstTupleNode.makeEmpty());
            });
          }
          return kStartingTokenTypeToBuildAddition[startToken().type()]();
        },
        range: mTokenRange.range,
        error
      });
      return inst;
    }
    return freeze22({ make });
  })();

  // src/ast_build/build_state_range_safety.ts
  var { freeze: freeze23 } = Helpers;
  var BuildStateRangeSafety = freeze23({
    make: () => {
      let mLastRange = Infinity;
      let mSizeSinceLastPop = 0;
      let mToleratedEqualRanges = 0;
      let mNodeActivity = false;
      const verifyDecreasing = () => {
        if (mToleratedEqualRanges < 2 && mLastRange === mSizeSinceLastPop) {
          ++mToleratedEqualRanges;
          return;
        } else if (mSizeSinceLastPop < mLastRange) {
          return;
        }
        throw Error("build state range not decreasing, probable infinite loop caught");
      };
      return freeze23({
        verifyRange: ({ start, end }) => {
          mSizeSinceLastPop += end - start;
          verifyDecreasing();
        },
        noteNodeAddition: () => {
          mNodeActivity = true;
        },
        resetSafetyCounts: () => {
          if (!mNodeActivity)
            mLastRange = mSizeSinceLastPop;
          mSizeSinceLastPop = 0;
          mToleratedEqualRanges = 0;
          mNodeActivity = false;
        }
      });
    }
  });

  // src/ast_build/build_state.ts
  var { freeze: freeze24 } = Helpers;
  var BuildState = freeze24({
    make: () => {
      const mCompleteNodes = [];
      const mIncompleteNodes = [];
      const mBuildParts = [];
      const { verifyRange, noteNodeAddition, resetSafetyCounts } = BuildStateRangeSafety.make();
      const inst = freeze24({
        pushPart: (buildPart) => {
          mBuildParts.push(buildPart);
          verifyRange(buildPart.range());
          return inst;
        },
        pushComplete: (node) => {
          while (mIncompleteNodes.length > 0) {
            const last = mIncompleteNodes[mIncompleteNodes.length - 1];
            node = last.finish(node);
            mIncompleteNodes.length--;
          }
          mCompleteNodes.push(node);
          noteNodeAddition();
          return inst;
        },
        pushIncomplete: (node) => {
          mIncompleteNodes.push(node);
          return inst;
        },
        hasRemainingParts: () => mBuildParts.length > 0,
        popPart: () => {
          const last = mBuildParts[mBuildParts.length - 1];
          if (!last) {
            throw Error(`Cannot pop build state, no parts remain`);
          }
          resetSafetyCounts();
          --mBuildParts.length;
          return last;
        },
        finish: () => AstTupleNode.make(mCompleteNodes)
      });
      return inst;
    }
  });

  // src/ast_build.ts
  var AstBuild = (() => {
    const { freeze: freeze28, memoize: memoize8 } = Helpers;
    const class_ = freeze28({
      make: (mTokens) => {
        const mErrors = [];
        const mBuildState = BuildState.make();
        const inst = freeze28({
          build: memoize8(() => {
            mBuildState.pushPart(TreePartBuild.make(mTokens));
            while (mBuildState.hasRemainingParts()) {
              const part = mBuildState.popPart();
              const addition = part.build();
              if (!addition) {
                mErrors.push(part.error());
                return;
              }
              addition.pushTo(mBuildState);
            }
            return mBuildState.finish();
          }),
          errors: () => mErrors
        });
        return inst;
      },
      buildFor: (tokens) => {
        const res = class_.make(tokens).build();
        if (!res) {
          throw Error("Cannot use buildFor for errorful tokens");
        }
        return res;
      }
    });
    return class_;
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
        if (rootNode.type() !== AstNode.types.tuple) {
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
        if (rootNode.type() !== AstNode.types.tuple) {
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
    describe("single line ast", () => {
      let tokens = [];
      const buildAst = () => AstBuild.buildFor(TokenRange.makeStartingRange(tokens));
      it("builds a simple function call", () => {
        tokens = [
          makeToken("\n"),
          makeToken("askString"),
          makeToken("("),
          makeToken(")"),
          makeToken("\n")
        ];
        const { verifyHit, hitsAtExactly } = ReachPoint.make();
        const rootNode = buildAst();
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitFunctionCall((node) => {
          hitsAtExactly(1);
          expect(node.name).toEqual("askString");
          expect(node.arguments.count()).toEqual(0);
        }).finish();
        rootNode.visit(visitor);
        expect(verifyHit()).toBeTruthy();
      });
    });
  });

  // tests/ast_build/tree_part_build_tests.ts
  var { describeNamed: describeNamed4 } = TestHelpers;
  describeNamed4({ TreePartBuild }, () => {
    const makeToken = Token.forTesting.makeFromStringOnly;
    const make = (tokens) => TreePartBuild.make(TokenRange.makeStartingRange(tokens));
    const makePtbRes = (...tokens) => TreePartBuild.make(TokenRange.makeStartingRange(tokens)).build();
    function includeHasAResultExample(ptbRes) {
      it("returns a result", () => {
        expect(ptbRes()).toBeDefined();
      });
    }
    const _viewParts = (ptbRes, fn, defaultBehavior) => {
      const mParts = [];
      const inst = Object.freeze({
        pushPart: (part) => {
          mParts.push(part);
          return inst;
        },
        pushComplete: (_0) => {
          defaultBehavior();
          return inst;
        },
        pushIncomplete: (_0) => {
          defaultBehavior();
          return inst;
        }
      });
      ptbRes?.pushTo(inst);
      fn(...mParts);
    };
    const viewAll = (ptbRes, fn) => {
      const mParts = [];
      const mCompleteNodes = [];
      const mIncompleteNodes = [];
      const inst = Object.freeze({
        pushPart: (part) => {
          mParts.push(part);
          return inst;
        },
        pushComplete: (node) => {
          mCompleteNodes.push(node);
          return inst;
        },
        pushIncomplete: (inode) => {
          mIncompleteNodes.push(inode);
          return inst;
        }
      });
      ptbRes?.pushTo(inst);
      fn(mParts, mCompleteNodes, mIncompleteNodes);
    };
    const viewOnlyParts = (ptbRes, fn) => _viewParts(ptbRes, fn, () => {
    });
    const allowOnlyParts = (ptbRes, fn) => _viewParts(ptbRes, fn, fail);
    function includeAddsOnePartExample(ptbRes) {
      it("add exactly one parts", () => {
        const { verifyHit, hitsAtExactly } = ReachPoint.make();
        allowOnlyParts(ptbRes(), (...args) => {
          expect(args.length).toEqual(1);
          hitsAtExactly(1);
        });
        expect(verifyHit()).toBeTruthy();
      });
    }
    describe('handles general case "( \\n ..."', () => {
      const args = [makeToken("("), makeToken("\n"), makeToken("a"), makeToken(")")];
      const ptbRes = () => makePtbRes(...args);
      includeHasAResultExample(ptbRes);
      includeAddsOnePartExample(ptbRes);
      it("left part range contains a range", () => {
        allowOnlyParts(ptbRes(), (left) => {
          expect(left.range()).toEqual({ start: 1, end: 3 });
        });
      });
    });
    describe('handles grouping case "( a )"', () => {
      const args = [makeToken("("), makeToken("a"), makeToken(")")];
      const ptbRes = () => makePtbRes(...args);
      includeHasAResultExample(ptbRes);
      includeAddsOnePartExample(ptbRes);
      it('left part range contains "\\n" and "a" range', () => {
        allowOnlyParts(ptbRes(), (left) => {
          expect(left.range()).toEqual({ start: 1, end: 2 });
        });
      });
    });
    describe('handles grouping case "( a , b )"', () => {
      const args = [
        makeToken("("),
        makeToken("a"),
        makeToken(","),
        makeToken("b"),
        makeToken(")")
      ];
      const ptbRes = () => makePtbRes(...args);
      includeHasAResultExample(ptbRes);
      includeAddsOnePartExample(ptbRes);
      it("left part range contains a range", () => {
        allowOnlyParts(ptbRes(), (left) => {
          expect(left.range()).toEqual({ start: 1, end: 4 });
        });
      });
    });
    describe('handles general operator case "a, b"', () => {
      const args = [makeToken("a"), makeToken(","), makeToken("b")];
      const ptbRes = () => makePtbRes(...args);
      includeHasAResultExample(ptbRes);
      it("adds build part", () => {
        const { verifyHit, hitsAtExactly } = ReachPoint.make();
        allowOnlyParts(ptbRes(), (part) => {
          hitsAtExactly(1);
          expect(part).toBeDefined();
        });
        expect(verifyHit()).toBeTruthy();
      });
      it("build part with remaining token", () => {
        allowOnlyParts(ptbRes(), (part) => {
          expect(part.range()).toEqual({ start: 2, end: 3 });
        });
      });
    });
    describe('handles function call case "f(...)..."', () => {
      describe(`a simple one parameter function call "f('a')"`, () => {
        const args = [
          makeToken("f"),
          makeToken("("),
          makeToken("'a'"),
          makeToken(")")
        ];
        const ptbRes = () => makePtbRes(...args);
        const next2ndPtbRes = () => {
          let res = void 0;
          allowOnlyParts(ptbRes(), (part) => {
            res = part.build();
          });
          return res;
        };
        includeHasAResultExample(ptbRes);
        it("pushes a new part", () => {
          allowOnlyParts(ptbRes(), (...parts) => {
            expect(parts.length).toEqual(1);
          });
        });
        describe("1st subsequent part", () => {
          it("adds an incomplete node", () => {
            viewAll(next2ndPtbRes(), (_0, _1, inodes) => {
              expect(inodes.length).toEqual(1);
            });
          });
          it("pushes a new part", () => {
            viewOnlyParts(next2ndPtbRes(), (...parts) => {
              expect(parts.length).toEqual(1);
            });
          });
        });
        describe("2nd subsequent part", () => {
          it("adds exactly one build part", () => {
            const { verifyHit, hitsAtExactly } = ReachPoint.make();
            viewAll(next2ndPtbRes(), (parts) => {
              allowOnlyParts(parts[0]?.build(), (...parts2) => {
                hitsAtExactly(1);
                expect(parts2.length).toEqual(1);
              });
            });
            expect(verifyHit()).toBeTruthy();
          });
          it("left build part with parameter token", () => {
            viewAll(next2ndPtbRes(), (parts) => {
              allowOnlyParts(
                parts[0]?.build(),
                (leftPart) => {
                  expect(leftPart.range()).toEqual({ start: 2, end: 3 });
                }
              );
            });
          });
        });
      });
    });
    describe("let declaration", () => {
      const args = [
        makeToken("let"),
        makeToken("a"),
        makeToken(":="),
        makeToken("'hello'")
      ];
      const ptbRes = () => makePtbRes(...args);
      includeHasAResultExample(ptbRes);
      it("starts with exactly one part", () => {
        const { verifyHit, hitsAtExactly } = ReachPoint.make();
        allowOnlyParts(ptbRes(), (...parts) => {
          hitsAtExactly(1);
          expect(parts.length).toEqual(1);
        });
        expect(verifyHit()).toBeTruthy();
      });
      it("starts with part containing remainder of tokens", () => {
        allowOnlyParts(ptbRes(), (part) => {
          expect(part.range()).toEqual({ start: 2, end: 4 });
        });
      });
      describe('progressing to ":="', () => {
        it("is reachable", () => {
          const { verifyHit, hitsAtExactly } = ReachPoint.make();
          allowOnlyParts(ptbRes(), (part) => {
            viewOnlyParts(part.build(), (part2) => {
              hitsAtExactly(1);
              expect(part2).toBeDefined();
            });
          });
          expect(verifyHit()).toBeTruthy();
        });
        it("builds part for remaining literal", () => {
          allowOnlyParts(ptbRes(), (part) => {
            viewOnlyParts(part.build(), (part2) => {
              expect(part2.range()).toEqual({ start: 3, end: 4 });
            });
          });
        });
      });
    });
    describe("simple cases", () => {
      function includeBuildsSingleTupleExamples(ptbRes) {
        it("builds no additional parts", () => {
          viewAll(ptbRes(), (parts) => {
            expect(parts.length).toEqual(0);
          });
        });
        it("builds a single node", () => {
          viewAll(ptbRes(), (_0, nodes) => {
            expect(nodes.length).toEqual(1);
          });
        });
        it("builds a tuple node", () => {
          viewAll(ptbRes(), (_0, nodes) => {
            expect(nodes[0].type()).toEqual(AstNode.types.tuple);
          });
        });
      }
      function includeImmediatelyBuildsStringableToAExamples(ptbRes) {
        it("immediately builds one node", () => {
          viewAll(ptbRes(), (_0, nodes) => {
            expect(nodes.length).toEqual(1);
          });
        });
        it("that node is a string node", () => {
          viewAll(ptbRes(), (_0, nodes) => {
            const fnode = AstFringeNode.downcast(nodes[0]);
            expect(fnode.asString()).toEqual("a");
          });
        });
      }
      describe("single string literal", () => {
        const ptbRes = () => make([makeToken("'a'")]).build();
        includeImmediatelyBuildsStringableToAExamples(ptbRes);
      });
      describe("new lines followed by nothing statements", () => {
        const ptbRes = () => make([makeToken("\n")]).build();
        includeBuildsSingleTupleExamples(ptbRes);
      });
      describe("empty statements", () => {
        const ptbRes = () => make([]).build();
        includeBuildsSingleTupleExamples(ptbRes);
      });
      describe("lone token followed by new line", () => {
        const args = [
          makeToken("a"),
          makeToken("\n")
        ];
        const ptbRes = () => make(args).build();
        it("does not add additional build parts", () => {
          viewAll(ptbRes(), (parts) => {
            expect(parts.length).toEqual(0);
          });
        });
        includeImmediatelyBuildsStringableToAExamples(ptbRes);
      });
    });
    describe("operator continuing across a new line", () => {
      const args = [
        makeToken("a"),
        makeToken(","),
        makeToken("\n"),
        makeToken("b")
      ];
      const ptbRes = () => make(args).build();
      it("adds exactly one part", () => {
        allowOnlyParts(ptbRes(), (...parts) => {
          expect(parts.length).toEqual(1);
        });
      });
      describe("subsequent build", () => {
        it("also builds on part", () => {
          allowOnlyParts(ptbRes(), (part) => {
            if (!part) {
              fail();
              return;
            }
            allowOnlyParts(part.build(), (...parts) => {
              expect(parts.length).toEqual(1);
            });
          });
        });
        describe("last subsequent build", () => {
          it("builds a single node", () => {
            allowOnlyParts(ptbRes(), (part) => {
              allowOnlyParts(part?.build(), (part2) => {
                viewAll(part2?.build(), (_0, nodes) => {
                  expect(nodes.length).toEqual(1);
                });
              });
            });
          });
          it("that single node is a tuple", () => {
            allowOnlyParts(ptbRes(), (part) => {
              allowOnlyParts(part?.build(), (part2) => {
                viewAll(part2?.build(), (_0, nodes) => {
                  expect(nodes[0]?.type()).toEqual(AstNode.types.tuple);
                });
              });
            });
          });
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

  // tests/ast_incomplete_binary_node_tests.ts
  var { describeNamed: describeNamed6 } = TestHelpers;
  describeNamed6({ AstIncompleteBinaryNode }, () => {
    const makeToken = Token.forTesting.makeFromStringOnly;
    const makeForOperator = IncompleteBinaryNodeCreation.make;
    function makeAnyNode() {
      return AstIdentifierNode.make("");
    }
    function makeForOperatorWithAnyNodes(operator) {
      return makeForOperator(makeToken(operator), makeAnyNode())?.makeNode()?.finish(makeAnyNode());
    }
    it("defers creation of a function call", () => {
      const createdType = makeForOperatorWithAnyNodes("call")?.type();
      expect(createdType).toEqual(AstNode.types.functionCall);
    });
    it("defers creation of a tuple", () => {
      const createdType = makeForOperatorWithAnyNodes(",")?.type();
      expect(createdType).toEqual(AstNode.types.tuple);
    });
    it("defers creation of an assignment", () => {
      const createdType = makeForOperatorWithAnyNodes(":=")?.type();
      expect(createdType).toEqual(AstNode.types.binaryOperator);
    });
  });

  // src/execution_context.ts
  var { freeze: freeze25 } = Helpers;
  var ExecutionContext = (() => {
    function make() {
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
      function getVariable(name) {
        const gotten = mAvailableVariables[name];
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
          return freeze25({
            resolve: gotten.type,
            error: () => StandardError.make().error()
          });
        } else {
          const { error, setErrorMessage } = StandardError.make();
          setErrorMessage(`Undeclared variable "${identifierName}"`);
          return freeze25({
            resolve: () => void 0,
            error
          });
        }
      }
      return freeze25({
        lookUpIdentifierType,
        lookUpStringLiteralType: () => string_resolution,
        lookUpIntegerLiteralType: () => integer_resolution,
        declareVariable,
        getValueOfVariable,
        setVariable,
        getVariable
      });
    }
    return freeze25({ make });
  })();

  // src/persistent_stack.ts
  var PersistentStack = (() => {
    const { freeze: freeze28 } = Helpers;
    function make(mDefaultMake) {
      const mMembers = [];
      let mPosition = -1;
      function _verifyNotEmpty() {
        if (!isEmpty())
          return;
        throw Error("Stack is empty");
      }
      function push() {
        const { length } = mMembers;
        if (mPosition + 1 === length) {
          mMembers.push(mDefaultMake());
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
      return freeze28({ push, pop, isEmpty });
    }
    return freeze28({ make });
  })();

  // src/interpreter.ts
  var { freeze: freeze26 } = Object;
  var LetVisitor = (() => {
    function make(context) {
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
    return freeze26({ make });
  })();
  var injections = freeze26({
    putsFunction: console.log,
    // not a blocker, just need to use a stack
    askStringFunction: (resume) => {
      new Promise((resolve) => {
        const answer = (inp) => resolve(inp);
        Helpers.expose({ answer });
      }).then((gotten) => {
        resume(gotten);
      });
    }
  });
  var Interpreter = freeze26({
    make: (context = ExecutionContext.make(), { putsFunction, askStringFunction } = injections) => {
      const mStack = PersistentStack.make(ContextVariable.make);
      const mLetVisitor = LetVisitor.make(context);
      function mValueOf(node) {
        const evalNode = AstEvaluatableNode.tryDowncast(node);
        if (evalNode) {
          return evalNode.evaluate(context.getVariable);
        }
        return mStack.pop();
      }
      const kBuiltinFunctions = freeze26({
        puts: (node) => {
          node.arguments.forEach((node2) => {
            const cv = mValueOf(node2);
            putsFunction(cv.asString());
          });
        },
        askString: (_0) => {
          askStringFunction((gotten) => {
            mStack.push().set(gotten);
          });
        }
      });
      const inst = AstNodeVisitorBuilder.makeDefaultingToContinue().visitFunctionCall((node) => {
        const fn = kBuiltinFunctions[node.name];
        if (!fn) {
          throw Error(`unimplemented function "${node.name}"`);
        }
        fn(node);
      }).visitLetDeclaration((_0, lhs) => {
        lhs.visit(mLetVisitor);
        lhs.visit(inst);
      }).visitBinaryOperation((node, lhs, rhs) => {
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
      }).finish();
      return inst;
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
      root.visit(Interpreter.make());
    }
  });
  Helpers.expose({ Interpreter });

  // tests/interpreter_tests.ts
  var { describeNamed: describeNamed7 } = TestHelpers;
  describeNamed7({ Interpreter }, () => {
    function makePutsFunction() {
      const printedStrings = [];
      const putsFunction = (str) => {
        printedStrings.push(str);
      };
      const askStringFunction = (_0) => {
      };
      const injections2 = { putsFunction, askStringFunction };
      return { injections: injections2, printedStrings };
    }
    function makeWithInjections(putsFunction, context) {
      return Interpreter.make(context ?? ExecutionContext.make(), { putsFunction, askStringFunction: (_0) => {
      } });
    }
    describe("integration specs", () => {
      it('compiles and runs a "hello world!" program', () => {
        const programRootNode = Interpreter.buildFor("puts('hello', ' world!')");
        const { printedStrings, injections: injections2 } = makePutsFunction();
        const interpreter = makeWithInjections(injections2.putsFunction);
        programRootNode.visit(interpreter);
        expect(printedStrings).toEqual(["hello", " world!"]);
      });
      it('compiles and runs a "hello world!" program with a variable', () => {
        const context = ExecutionContext.make();
        context.declareVariable("foo").set("hello world!");
        const programRootNode = Interpreter.buildFor("puts(foo)");
        const { printedStrings, injections: injections2 } = makePutsFunction();
        const interpreter = Interpreter.make(context, injections2);
        programRootNode.visit(interpreter);
        expect(printedStrings).toEqual(["hello world!"]);
      });
      it('compiles and runs a multiline "hello world!" program', () => {
        const programRootNode = Interpreter.buildFor("puts('hello')\nputs('world!')");
        const { printedStrings, injections: injections2 } = makePutsFunction();
        const interpreter = makeWithInjections(injections2.putsFunction);
        programRootNode.visit(interpreter);
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
        programRootNode.visit(intr);
        expect(printedStrings).toEqual(["hello world!"]);
      });
      it("compiles and runs a simple program with a let declaration", () => {
        const programRootNode = Interpreter.buildFor(`
        let a := 'hello world!'
        puts(a)
      `);
        const { printedStrings, injections: injections2 } = makePutsFunction();
        const intr = makeWithInjections(injections2.putsFunction);
        programRootNode.visit(intr);
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
        programRootNode.visit(intr);
        expect(printedStrings).toEqual(["4"]);
      });
    });
  });

  // tests/persistent_stack_tests.ts
  var { describeNamed: describeNamed8 } = TestHelpers;
  describeNamed8({ PersistentStack }, () => {
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
  var { describeNamed: describeNamed9 } = TestHelpers;
  describeNamed9({ Tokenization }, () => {
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
  var { describeNamed: describeNamed10 } = TestHelpers;
  describeNamed10({ CharacterClass }, () => {
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
  var { describeNamed: describeNamed11 } = TestHelpers;
  describeNamed11({ CharacterCrawler }, () => {
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
  });

  // tests/tokenization/crawl_strategies_tests.ts
  var { describeNamed: describeNamed12 } = TestHelpers;
  describeNamed12({ CrawlStrategies }, () => {
    const { alphabetic, literal, operative, spacious } = CharacterClass.classes;
    const crawlAlphanumeric = CrawlStrategies[alphabetic];
    const crawlOperator = CrawlStrategies[operative];
    const crawlStringLiteral = CrawlStrategies[literal];
    const crawlSpace = CrawlStrategies[spacious];
    describeNamed12({ crawlAlphanumeric }, () => {
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
    describeNamed12({ crawlOperator }, () => {
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
    describeNamed12({ crawlSpace }, () => {
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
    describeNamed12({ crawlStringLiteral }, () => {
      it(`crawls stopping at nothing but another "'"`, () => {
        const str = `'hello {" \\\\''`;
        const end = crawlStringLiteral(str, 0);
        expect(str.substring(0, end)).toEqual(`'hello {" \\\\'`);
      });
    });
  });

  // src/ast_validator.ts
  var { freeze: freeze27, memoize: memoize7 } = Helpers;
  var ErrorsCollector = freeze27({
    make: () => {
      const mErrors = [];
      return freeze27({
        pushMessage: (message) => {
          mErrors.push({ message });
        },
        errors: () => mErrors
      });
    }
  });
  var AstLetBinaryOperatorValidatorVisitor = freeze27({
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
      return freeze27({
        ...visitor,
        errors: mErrorsCollector.errors
      });
    }
  });
  var AstGeneralValidator = freeze27({
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
      return freeze27({
        ...visitor,
        errors: mErrorsCollector.errors
      });
    }
  });
  var AstLetsValidatorVisitor = freeze27({
    make: (mBinaryOperatorVisitor, mErrorsCollector) => {
      const visitor = AstNodeVisitorBuilder.makeDefaultingToStop().visitLetDeclaration((_0, node) => {
        if (node.type() !== AstNode.types.binaryOperator) {
          mErrorsCollector.pushMessage(`Cannot declare using a(n) ${AstNode.typeToString(node.type())}`);
          return;
        }
        node.visit(mBinaryOperatorVisitor);
      }).finish();
      return freeze27({
        ...visitor,
        errors: mErrorsCollector.errors
      });
    }
  });
  var AstValidator = freeze27({
    make: (mContext = ExecutionContext.make(), mErrorsCollector = ErrorsCollector.make()) => {
      const mGeneralValidator = AstGeneralValidator.make(
        mContext,
        mErrorsCollector,
        memoize7(() => {
          const binLetVal = AstLetBinaryOperatorValidatorVisitor.make(mContext, mGeneralValidator, mErrorsCollector);
          return AstLetsValidatorVisitor.make(binLetVal, mErrorsCollector);
        })
      );
      return freeze27({
        validate: (node) => {
          node.visit(mGeneralValidator);
          return mErrorsCollector.errors();
        }
      });
    }
  });

  // tests/ast_validator_tests.ts
  var { describeNamed: describeNamed13 } = TestHelpers;
  describeNamed13({ AstValidator }, () => {
    function validateAsTuple(node, validator) {
      const topTupleNode = AstTupleNode.make([node]);
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
})();
