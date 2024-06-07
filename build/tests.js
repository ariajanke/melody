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
    // passWhenInTesting
  });
  var StandardError = (() => {
    const { freeze: freeze21 } = Helpers;
    function make() {
      let mErrorFn = () => {
      };
      function setErrorFn(fn) {
        mErrorFn = fn;
      }
      function setErrorMessage(message) {
        mErrorFn = () => freeze21({ message });
      }
      function error() {
        return mErrorFn();
      }
      return freeze21({ setErrorFn, setErrorMessage, error });
    }
    return freeze21({ make });
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
      //,
      // satisfactionDegreeOfArguments
    });
  })();

  // src/object_type.ts
  var { freeze: freeze3 } = Helpers;
  var ObjectType = (() => {
    const { memoize: memoize4 } = Helpers;
    const kBuiltInTypeUids = freeze3({
      integer: Symbol(),
      string: Symbol()
    });
    function makeUidFor(name) {
      switch (name) {
        case "Integer":
          return kBuiltInTypeUids.integer;
        case "String":
          return kBuiltInTypeUids.string;
        default:
          return Symbol();
      }
    }
    function make(name) {
      name ??= "<anonymous>";
      let mLookupTable = {};
      const inst = freeze3({
        lookUp,
        name: () => name,
        uid: makeUidFor(name),
        setLookUp,
        asSingluarParameter: memoize4(asSingluarParameter)
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
        const res = lhs.asNumber() + rhs.asNumber();
        stack.push().set(res);
      }).finish();
      const sub = IncompleteFunctionType.make().setName("-").setArguments(integer_.asSingluarParameter()).setReturns([integer_]).setBuiltin((stack, lhs, rhs) => {
        const res = lhs.asNumber() - rhs.asNumber();
        stack.push().set(res);
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
    function makeUndefinedExecutionType(nodeTypeName) {
      return (_0) => {
        throw Error(`${nodeTypeName} does not implement executionType`);
      };
    }
    return freeze6({
      base: {
        makeUndefinedExecutionType
      },
      executionTypes,
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
  })();
  var AstEvaluatableNode = (() => {
    const { stringLiteral, identifier, integerLiteral } = AstNode.types;
    return freeze6({
      tryDowncast: (node) => {
        switch (node.type()) {
          case stringLiteral:
          case identifier:
          case integerLiteral:
            return node;
          default:
            return void 0;
        }
      }
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
      error: () => void 0
    })
  });

  // src/ast_binary_operator_node.ts
  var AstBinaryOperatorNode = (() => {
    const { freeze: freeze21 } = Helpers;
    const binaryOperatorType = AstNode.types.binaryOperator;
    return freeze21({
      make: (op, lhs, rhs) => {
        return freeze21({
          visit: (visitor) => {
            visitor.visitBinaryOperation(op, lhs, rhs);
          },
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
          }
        });
      }
    });
  })();

  // src/token.ts
  var { freeze: freeze8 } = Object;
  var TokenType = freeze8({
    declareFunction: Symbol(),
    operator: Symbol(),
    stringLiteral: Symbol(),
    newLine: Symbol(),
    identifier: Symbol(),
    integerLiteral: Symbol()
  });
  var Token = (() => {
    function unimplemented(desc) {
      return () => {
        throw Error(`Cannot call ${desc} unimplemented`);
      };
    }
    const kBlankToken = freeze8({
      type: unimplemented("type"),
      // TODO: try to get rid of this hack, blank token should
      // never be used
      content: () => "",
      start: unimplemented("start"),
      end: unimplemented("end")
    });
    function identifyNonKeyword(token) {
      const firstChar = token[0];
      switch (firstChar) {
        case "'":
          return TokenType.stringLiteral;
        case "\n":
          return TokenType.newLine;
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          return TokenType.integerLiteral;
        case " ":
        case "	":
        case "\r":
          throw Error("cannot build token from whitespace");
      }
      return TokenType.identifier;
    }
    const controlSeqs = {
      ["let"]: TokenType.operator,
      ["fn"]: TokenType.declareFunction,
      ["{"]: TokenType.operator,
      ["}"]: TokenType.operator,
      ["("]: TokenType.operator,
      [")"]: TokenType.operator,
      [","]: TokenType.operator,
      ["+"]: TokenType.operator,
      ["-"]: TokenType.operator,
      ["*"]: TokenType.operator,
      [":="]: TokenType.operator
    };
    function makeFromStringOnly(mContents) {
      return construct(mContents, 0, 0);
    }
    function make(mInput, mStart, mEnd) {
      return construct(mInput.substring(mStart, mEnd), mStart, mEnd);
    }
    function construct(mTokenContent, mStart, mEnd) {
      const mType = controlSeqs[mTokenContent] ?? identifyNonKeyword(mTokenContent);
      function content() {
        return mTokenContent;
      }
      function start() {
        return mStart;
      }
      function end() {
        return mEnd;
      }
      function type() {
        return mType;
      }
      return freeze8({ content, start, end, type });
    }
    return freeze8({
      make,
      types: TokenType,
      kBlankToken,
      forTesting: { makeFromStringOnly }
    });
  })();

  // src/ast_integer_literal_node.ts
  var { freeze: freeze9 } = Helpers;
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
      return freeze9({
        visit: (_0) => {
        },
        type: () => kIntType,
        executionType: (types) => types.lookUpIntegerLiteralType(),
        evaluate: (_0) => ContextVariable.make(mValue),
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
    return freeze9({ make, valueOf });
  })();

  // src/ast_fringe_node.ts
  var { freeze: freeze10 } = Helpers;
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
    return freeze10({ downcast, hasCreated, makeForToken });
  })();
  var AstStringLiteralNode = (() => {
    const kStringLiteral = AstNode.types.stringLiteral;
    function make(mValue) {
      mValue = (() => {
        if (mValue.length <= 2) {
          throw Error("not a valid string");
        }
        return mValue.substring(1, mValue.length - 1);
      })();
      const mAsContextVar = ContextVariable.make(mValue);
      return freeze10({
        comesBeforeOperator: (operator) => operator.content() === ",",
        executionType: (types) => types.lookUpStringLiteralType(),
        evaluate: (_0) => mAsContextVar,
        type: () => kStringLiteral,
        asString: () => mValue,
        visit: (_0) => {
        }
      });
    }
    return freeze10({ make });
  })();
  var AstIdentifierNode = (() => {
    const kIndentifier = AstNode.types.identifier;
    const kOperators = freeze10({
      ",": true,
      "(": true,
      ":=": true,
      "+": true,
      "-": true,
      "*": true
    });
    function make(value) {
      const inst = freeze10({
        comesBeforeOperator: (operator) => !!kOperators[operator.content()],
        executionType: (types) => types.lookUpIdentifierType(value),
        evaluate: (getter) => getter(value),
        type: () => kIndentifier,
        asString: () => value,
        visit: (visitor) => {
          visitor.visitIdentifier(inst);
        }
      });
      return inst;
    }
    return freeze10({ make });
  })();

  // src/ast_node_visitor.ts
  var { freeze: freeze11 } = Helpers;
  var AstNodeVisitorBuilder = (() => {
    function makeContinuingImplementations() {
      let mCurrentInst = freeze11({
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
        setInstanceReference: (inst) => {
          mCurrentInst = inst;
          return inst;
        }
      });
      return mCurrentInst;
    }
    const kStoppingImplementations = (() => {
      const inst = freeze11({
        visitBinaryOperation: (_0, _1, _2) => {
        },
        visitFunctionCall: (_0) => {
        },
        visitLetDeclaration: (_0, _1) => {
        },
        visitIdentifier: (_0) => {
        },
        setInstanceReference: (passedInst) => {
          return passedInst;
        }
      });
      return inst;
    })();
    const class_ = freeze11({
      makeDefaultingToStop: () => class_.make(kStoppingImplementations),
      makeDefaultingToContinue: () => class_.make(makeContinuingImplementations()),
      make: (mImplementations) => {
        let mVisitBinaryOperation = mImplementations.visitBinaryOperation;
        let mVisitFunctionCall = mImplementations.visitFunctionCall;
        let mVisitLetDeclaration = mImplementations.visitLetDeclaration;
        let mVisitIdentifier = mImplementations.visitIdentifier;
        const inst = freeze11({
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
          finish: () => {
            const inst2 = freeze11({
              visitBinaryOperation: mVisitBinaryOperation,
              visitFunctionCall: mVisitFunctionCall,
              visitLetDeclaration: mVisitLetDeclaration,
              visitIdentifier: mVisitIdentifier
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
      const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitBinaryOperation((_0, node, _2) => {
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

  // src/ast_tuple_node.ts
  var AstTupleNode = (() => {
    const { freeze: freeze21 } = Object;
    const tupleType = AstNode.types.tuple;
    const executionType = AstNode.base.makeUndefinedExecutionType("AstTupleNode");
    function makeBinary(_0, lhs, rhs) {
      return makeWithPair(lhs, rhs);
    }
    function makeUnary(lhs) {
      return makeWithPair(lhs, void 0);
    }
    function makeWithPair(lhs, rhs) {
      const mSubExpressions = [lhs];
      const inst = make(mSubExpressions);
      if (rhs && inst.mergeWith(rhs)) {
        mSubExpressions.push(rhs);
      }
      return inst;
    }
    function make(mSubExpressions) {
      const inst = freeze21({
        forEach,
        count,
        visit,
        type,
        mergeWith,
        executionType
      });
      function forEach(fn) {
        mSubExpressions.forEach((node) => fn(node));
      }
      function count() {
        return mSubExpressions.length;
      }
      function visit(visitor) {
        mSubExpressions.forEach((node) => {
          node.visit(visitor);
        });
      }
      function type() {
        return tupleType;
      }
      function mergeWith(node) {
        if (node.type() !== tupleType) {
          return node;
        }
        node.forEach((subNode) => {
          mSubExpressions.push(subNode);
        });
        return void 0;
      }
      return inst;
    }
    return freeze21({ makeBinary, makeUnary, make });
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
        executionType
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

  // src/token_range.ts
  var { freeze: freeze13 } = Helpers;
  var TokenRange = (() => {
    function zeroSizedRange(range) {
      return range.start() === range.end();
    }
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
      const inst = freeze13({
        step: () => {
          ++mStart;
          return _verifyValidRange();
        },
        skipNewLine: () => {
          if (inst.tokenAt(mStart).type() === Token.types.newLine) {
            ++mStart;
          }
          return inst;
        },
        clone: (start, end) => make(mTokens, start ?? mStart, end ?? mEnd),
        tokenAt: (i) => mTokens[i],
        start: () => mStart,
        end: () => mEnd,
        parentContainerSize: () => mTokens.length
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
    return freeze13({ make, makeStartingRange, zeroSizedRange, forEachIn });
  })();

  // src/ast_build/tree_part_tuple_division.ts
  var TreePartTupleDivision = (() => {
    const { memoize: memoize4, freeze: freeze21 } = Helpers;
    const kCloseMapping = freeze21({
      ["("]: ")"
      // ['fn']: 'end'
    });
    const class_ = freeze21({
      make: (mTokenRange, mOperatorToken) => construct(mTokenRange, mOperatorToken.content())
    });
    function construct(mTokenRange, mFindCloseBasedOn) {
      const { error, setErrorMessage } = StandardError.make();
      const { start, end, parentContainerSize, tokenAt } = mTokenRange;
      const mCloseMapping = kCloseMapping[mFindCloseBasedOn];
      const closePosition = memoize4(() => {
        if (!mCloseMapping) {
          return end();
        }
        const count = parentContainerSize();
        for (let i = start(); i < count; ++i) {
          if (tokenAt(i).content() === mCloseMapping) {
            return i;
          }
        }
        return setErrorMessage(`Cannot find close position for ${mFindCloseBasedOn}`);
      });
      const inst = freeze21({
        leftPart: memoize4(() => {
          const pos = closePosition();
          if (!pos)
            return void 0;
          const lineCont = mCloseMapping ? LineContinuationScheme.inGroup : LineContinuationScheme.operatorContinued;
          return TreePartBuild.make(mTokenRange.clone(start(), pos), lineCont);
        }),
        rightPart: memoize4(() => {
          const pos = closePosition();
          if (!pos) {
            throw Error("call and test against leftPart first");
          }
          const start2 = Math.min(end(), pos + 1);
          return TreePartBuild.make(mTokenRange.clone(start2, end()), LineContinuationScheme.normal);
        }),
        error
      });
      return inst;
    }
    return class_;
  })();

  // src/ast_build/node_expansion.ts
  var { freeze: freeze14 } = Helpers;
  var NodeExpansionVisitor = (() => {
    function makeDefaultImplementations(fn) {
      return freeze14({
        visitLeftPartOnly: (_0) => {
          fn();
        },
        visitLeftWithNode: (_0, _1) => {
          fn();
        },
        visitRightPartOnly: (_0) => {
          fn();
        },
        visitRightNodeOnly: (_0) => {
          fn();
        },
        visitRightWithPart: (_0, _1) => {
          fn();
        }
      });
    }
    function makeOverrider(defaultOnCallback = () => {
    }) {
      const mInstance = { ...makeDefaultImplementations(defaultOnCallback) };
      const inst = freeze14({
        visitLeftPartOnly,
        visitLeftWithNode,
        visitRightPartOnly,
        visitRightNodeOnly,
        visitRightWithPart,
        finish
      });
      function visitLeftPartOnly(fn) {
        mInstance.visitLeftPartOnly = fn;
        return inst;
      }
      function visitLeftWithNode(fn) {
        mInstance.visitLeftWithNode = fn;
        return inst;
      }
      function visitRightPartOnly(fn) {
        mInstance.visitRightPartOnly = fn;
        return inst;
      }
      function visitRightNodeOnly(fn) {
        mInstance.visitRightNodeOnly = fn;
        return inst;
      }
      function visitRightWithPart(fn) {
        mInstance.visitRightWithPart = fn;
        return inst;
      }
      function finish() {
        return freeze14(mInstance);
      }
      return inst;
    }
    return freeze14({ makeOverrider });
  })();
  var NodeExpansion = (() => {
    const { freeze: freeze21, verifyInTesting: verifyInTesting3 } = Helpers;
    function visit(_0) {
    }
    function makeBase() {
      const { type, hasCreated } = TypeCheckable.make();
      return freeze21({ hasCreated, type, freeze: freeze21, visit, verifyInTesting: verifyInTesting3 });
    }
    return freeze21({ makeBase });
  })();
  var EmptyNodeExpansion = (() => {
    const { type, hasCreated, visit } = NodeExpansion.makeBase();
    const kEmpty = [];
    function expandIntoNodes(_0) {
      return kEmpty;
    }
    const sharedInst = freeze14({
      expandIntoNodes,
      type,
      visit
    });
    function make() {
      return sharedInst;
    }
    return freeze14({ make, hasCreated });
  })();

  // src/ast_build/left_side_node_expansion.ts
  var BareLeftTreePartHandler = (() => {
    const { freeze: freeze21 } = Object;
    const kSharedInst = freeze21({ handleLeftSide, visit });
    function handleLeftSide(nodes) {
      return nodes;
    }
    function visit(leftPart, visitor) {
      visitor.visitLeftPartOnly(leftPart);
    }
    function make() {
      return kSharedInst;
    }
    return freeze21({ make });
  })();
  var IncompleteNodeLeftTreePartHandler = (() => {
    const { freeze: freeze21 } = Object;
    function make(incompleteNode) {
      function handleLeftSide(nodes) {
        const [head, ...tail] = nodes;
        if (!head) {
          return [];
        }
        return [incompleteNode.finish(head), ...tail];
      }
      function visit(leftPart, visitor) {
        visitor.visitLeftWithNode(incompleteNode, leftPart);
      }
      return freeze21({ handleLeftSide, visit });
    }
    return freeze21({ make });
  })();
  var LeftSideNodeExpansion = (() => {
    const { freeze: freeze21 } = Object;
    function make(leftPartHandler, leftPart, rightPart) {
      const {
        type,
        verifyInTesting: verifyInTesting3
      } = NodeExpansion.makeBase();
      function expandIntoNodes(fn) {
        return [
          ...leftPartHandler.handleLeftSide(fn(leftPart)),
          ...fn(rightPart)
        ];
      }
      function visit(visitor) {
        verifyInTesting3();
        leftPartHandler.visit(leftPart, visitor);
        visitor.visitRightPartOnly(rightPart);
      }
      return freeze21({ expandIntoNodes, type, visit });
    }
    return freeze21({ make });
  })();

  // src/ast_build/partial_tree_start_group_build.ts
  var PartialTreeStartGroupBuild = (() => {
    const { memoize: memoize4, freeze: freeze21 } = Helpers;
    function make(leftPartHandler, mTokenRange, mOperatorToken) {
      const { error, setErrorFn } = StandardError.make();
      function build() {
        const nextPart = TreePartTupleDivision.make(mTokenRange.skipNewLine(), mOperatorToken);
        const leftPart = nextPart.leftPart() ?? setErrorFn(nextPart.error);
        if (!leftPart) {
          return;
        }
        const rightPart = nextPart.rightPart();
        return LeftSideNodeExpansion.make(leftPartHandler, leftPart, rightPart);
      }
      return freeze21({
        build: memoize4(build),
        error
      });
    }
    return freeze21({ make });
  })();

  // src/ast_function_call_node.ts
  var AstFunctionCallNode = (() => {
    const nodeTypes = AstNode.types;
    const executionType = AstNode.base.makeUndefinedExecutionType("AstFunctionCallNode");
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
        executionType
      });
      function visit(visitor) {
        visitor.visitFunctionCall(inst);
      }
      return inst;
    }
    return Object.freeze({ make });
  })();

  // src/ast_incomplete_binary_node.ts
  var { freeze: freeze15 } = Helpers;
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
      return freeze15({ finish, lhsAsString });
    }
    return freeze15({ make });
  })();
  var IncompleteNodeCreation = (() => {
    const { error, setErrorMessage } = StandardError.make();
    function make(mOperator, mLhs) {
      function _selectedConstructor() {
        const tokenStr = mOperator.content();
        switch (tokenStr) {
          case "(":
            return AstFunctionCallNode.make;
          case ",":
          case "\n":
            return AstTupleNode.makeBinary;
          case ":=":
          case "+":
          case "-":
          case "*":
            return AstBinaryOperatorNode.make;
          default:
            break;
        }
        return setErrorMessage(`Token ${tokenStr} does not result in a binary operator`);
      }
      function makeNode() {
        const selected = _selectedConstructor();
        if (!selected) {
          return;
        }
        return AstIncompleteBinaryNode.make(selected, mOperator.content(), mLhs);
      }
      return freeze15({ makeNode, error });
    }
    return freeze15({ make });
  })();

  // src/ast_build/right_side_node_expansion.ts
  var { freeze: freeze16 } = Helpers;
  var BareRightTreePartHandler = (() => {
    function make() {
      function handleRightSide(_0) {
        return [];
      }
      function visit(node, visitor) {
        visitor.visitRightNodeOnly(node);
      }
      return freeze16({ handleRightSide, visit });
    }
    return freeze16({ make });
  })();
  var BuildPartRightTreePartHandler = (() => {
    function make(rightPart) {
      function handleRightSide(fn) {
        return fn(rightPart);
      }
      function visit(node, visitor) {
        visitor.visitRightWithPart(node, rightPart);
      }
      return freeze16({ handleRightSide, visit });
    }
    return freeze16({ make });
  })();
  var RightSideNodeExpansion = (() => {
    function make(node, rightHandler) {
      const { type, verifyInTesting: verifyInTesting3 } = NodeExpansion.makeBase();
      function expandIntoNodes(fn) {
        return [
          node,
          ...rightHandler.handleRightSide(fn)
        ];
      }
      function visit(visitor) {
        verifyInTesting3();
        rightHandler.visit(node, visitor);
      }
      return freeze16({ type, expandIntoNodes, visit });
    }
    return freeze16({ make });
  })();

  // src/ast_build/partial_tree_start_operator_build.ts
  var PartialTreeStartOperatorBuild = (() => {
    const { freeze: freeze21 } = Helpers;
    function make(mIncompleteNode, mOperatorToken, mTokenRange) {
      const { setErrorFn, error } = StandardError.make();
      function build() {
        const leftTreePartHandler = IncompleteNodeLeftTreePartHandler.make(mIncompleteNode);
        const { build: build2, error: error2 } = PartialTreeStartGroupBuild.make(leftTreePartHandler, mTokenRange, mOperatorToken);
        return build2() ?? setErrorFn(error2);
      }
      return freeze21({ build, error });
    }
    return freeze21({ make });
  })();

  // src/ast_build/partial_tree_start_fringe_build.ts
  var { freeze: freeze17 } = Helpers;
  var PartialTreeStartFringeBuild = (() => {
    const tokenTypes = Token.types;
    const makeFringeNodeFor = AstFringeNode.makeForToken;
    const { zeroSizedRange } = TokenRange;
    function make(mStartToken, mTokenRange, mLineContScheme) {
      const { error, setErrorMessage, setErrorFn } = StandardError.make();
      function build() {
        const lhsNode = makeFringeNodeFor(mStartToken);
        if (zeroSizedRange(mTokenRange)) {
          return RightSideNodeExpansion.make(lhsNode, BareRightTreePartHandler.make());
        }
        if (mLineContScheme === LineContinuationScheme.inGroup) {
          mTokenRange.skipNewLine();
        }
        const next = mTokenRange.tokenAt(mTokenRange.start());
        mTokenRange.step();
        if (next.type() === tokenTypes.operator) {
          if (!lhsNode.comesBeforeOperator(next)) {
            return setErrorMessage(`operator "${next.content()}" not allowed here`);
          }
          const nodeCreation = IncompleteNodeCreation.make(next, lhsNode);
          const incompleteNode = nodeCreation.makeNode();
          if (!incompleteNode) {
            return setErrorFn(nodeCreation.error);
          }
          const { build: build2, error: error2 } = PartialTreeStartOperatorBuild.make(incompleteNode, next, mTokenRange);
          return build2() ?? setErrorFn(error2);
        } else if (next.type() === tokenTypes.newLine) {
          const { normal } = LineContinuationScheme;
          const rightPart = TreePartBuild.make(mTokenRange, normal);
          const ph = BuildPartRightTreePartHandler.make(rightPart);
          return RightSideNodeExpansion.make(lhsNode, ph);
        } else {
          return setErrorMessage(`not sure how to handle token "${next.content()}"`);
        }
      }
      return freeze17({ build, error });
    }
    return freeze17({ make });
  })();

  // src/ast_build/tree_part_build.ts
  var { freeze: freeze18, verifyInTesting: verifyInTesting2 } = Helpers;
  var LineContinuationScheme = freeze18({
    inGroup: Symbol(),
    operatorContinued: Symbol(),
    normal: Symbol()
  });
  var TreePartBuild = (() => {
    const tokenTypes = Token.types;
    const { zeroSizedRange } = TokenRange;
    function make(mTokenRange, mLineContScheme) {
      const { error, setErrorFn, setErrorMessage } = StandardError.make();
      function tokenProducingFringeNode(token) {
        return {
          [tokenTypes.identifier]: true,
          [tokenTypes.integerLiteral]: true,
          [tokenTypes.stringLiteral]: true
        }[token.type()] ?? false;
      }
      function buildPart() {
        if (zeroSizedRange(mTokenRange)) {
          return EmptyNodeExpansion.make();
        }
        mTokenRange.skipNewLine();
        if (zeroSizedRange(mTokenRange)) {
          return EmptyNodeExpansion.make();
        }
        const start = mTokenRange.tokenAt(mTokenRange.start());
        mTokenRange.step();
        if (tokenProducingFringeNode(start)) {
          const { build, error: error2 } = PartialTreeStartFringeBuild.make(start, mTokenRange, mLineContScheme);
          return build() ?? setErrorFn(error2);
        } else if (start.content() === "(") {
          const { build, error: error2 } = PartialTreeStartGroupBuild.make(
            BareLeftTreePartHandler.make(),
            mTokenRange,
            start
          );
          return build() ?? setErrorFn(error2);
        } else if (start.type() == tokenTypes.operator) {
          const incompleteNode = AstIncompleteUnaryNode.makeForOperator(start.content());
          const { build, error: error2 } = PartialTreeStartOperatorBuild.make(incompleteNode, start, mTokenRange);
          return build() ?? setErrorFn(error2);
        }
        setErrorMessage("unimplemented case");
      }
      function range() {
        verifyInTesting2();
        const { start, end } = mTokenRange;
        return freeze18({ start: start(), end: end() });
      }
      return freeze18({ buildPart, error, range });
    }
    return freeze18({ make });
  })();

  // src/ast_build.ts
  var AstBuild = (() => {
    const { freeze: freeze21, memoize: memoize4 } = Helpers;
    const class_ = freeze21({
      make: (mTokens) => {
        const mErrors = [];
        function _buildProgramSequence(partBuild) {
          const part = partBuild.buildPart();
          if (!part) {
            mErrors.push(partBuild.error());
            return [];
          }
          return part.expandIntoNodes(_buildProgramSequence);
        }
        const inst = freeze21({
          build: memoize4(() => {
            const partBuild = TreePartBuild.make(mTokens, LineContinuationScheme.normal);
            const res = _buildProgramSequence(partBuild).map((n) => n);
            if (mErrors.length !== 0) {
              return;
            }
            return AstTupleNode.make(res);
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
    describe("builds a mutli-line ast", () => {
      let tokens = [];
      const buildAst = () => AstBuild.buildFor(TokenRange.makeStartingRange(tokens));
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
        const { points, verifyAllHit } = ReachPoint.makeCollection(1);
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
          points()[0].hitsAtExactly(1);
          node.arguments.forEach((node2) => {
            node2.visit(visitor);
          });
        }).finish();
        buildAst().visit(visitor);
        expect(verifyAllHit()).toBeTruthy();
      });
      it("builds ast with arthimetic", () => {
        tokens = [
          makeToken("2"),
          makeToken("+"),
          makeToken("2")
        ];
        let vop = "";
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitBinaryOperation((op, lhs, rhs) => {
          const { valueOf } = AstIntegerLiteralNode;
          vop = op;
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
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitBinaryOperation((op, lhs, rhs) => {
          foundOperators.push(op);
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
        const visitor = AstNodeVisitorBuilder.makeDefaultingToContinue().visitBinaryOperation((op, lhs, rhs) => {
          foundOperators.push(op);
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
  });

  // tests/ast_build/tree_part_build_tests.ts
  var { describeNamed: describeNamed4 } = TestHelpers;
  describeNamed4({ TreePartBuild }, () => {
    const makeToken = Token.forTesting.makeFromStringOnly;
    const normalCont = LineContinuationScheme.normal;
    const make = (tokens) => TreePartBuild.make(TokenRange.makeStartingRange(tokens), normalCont);
    const makePtbRes = (...tokens) => TreePartBuild.make(TokenRange.makeStartingRange(tokens), normalCont).buildPart();
    const ptbWithVisitor = (ptbRes, fn) => {
      ptbRes()?.visit(fn());
    };
    function includeHasAResultExample(ptbRes) {
      it("returns a result", () => {
        expect(ptbRes()).toBeDefined();
      });
    }
    describe('handles general case "( \\n ..."', () => {
      const args = [makeToken("("), makeToken("\n"), makeToken("a"), makeToken(")")];
      const ptbRes = () => makePtbRes(...args);
      includeHasAResultExample(ptbRes);
      it("is composed of a left and right part only", () => {
        let leftPartCalls = 0;
        let rightPartCalls = 0;
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftPartOnly((_0) => {
          ++leftPartCalls;
        }).visitRightPartOnly((_1) => {
          ++rightPartCalls;
        }).finish());
        expect(leftPartCalls).toEqual(1);
        expect(rightPartCalls).toEqual(1);
      });
      it("makes right part with none of the tokens", () => {
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftPartOnly((_0) => {
        }).visitRightPartOnly((rightPart) => {
          const { start, end } = rightPart.range();
          expect(start).toEqual(4);
          expect(end).toEqual(4);
        }).finish());
      });
      it("makes left part with the remainder of the tokens, skipping new line", () => {
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftPartOnly((leftPart) => {
          const { start, end } = leftPart.range();
          expect(start).toEqual(2);
          expect(end).toEqual(3);
        }).visitRightPartOnly((_0) => {
        }).finish());
      });
    });
    function includeHasLeftAndRightPointWithNoNodes(ptbRes) {
      it("has left and right point with no nodes", () => {
        const { points, verifyAllHit } = ReachPoint.makeCollection(2);
        const [pt1, pt2] = points();
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftPartOnly((_0) => {
          pt1.hitsAtExactly(1);
        }).visitRightPartOnly((_0) => {
          pt2.hitsAtExactly(1);
        }).finish());
        expect(verifyAllHit()).toBeTruthy();
      });
    }
    describe('handles grouping case "( a )"', () => {
      const args = [makeToken("("), makeToken("a"), makeToken(")")];
      const ptbRes = () => makePtbRes(...args);
      includeHasLeftAndRightPointWithNoNodes(ptbRes);
      it("has left and right point with no nodes", () => {
        const { points, verifyAllHit } = ReachPoint.makeCollection(2);
        const [pt1, pt2] = points();
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftPartOnly((_0) => {
          pt1.hitsAtExactly(1);
        }).visitRightPartOnly((_0) => {
          pt2.hitsAtExactly(1);
        }).finish());
        expect(verifyAllHit()).toBeTruthy();
      });
      it("left part contains no tokens", () => {
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftPartOnly((leftPart) => {
          expect(args[leftPart.range().start].content()).toEqual("a");
        }).visitRightPartOnly((_0) => {
        }).finish());
      });
      it('right part contains the "a" token', () => {
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftPartOnly((_0) => {
        }).visitRightPartOnly((rightPart) => {
          const { start, end } = rightPart.range();
          expect(start).toEqual(end);
        }).finish());
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
      includeHasLeftAndRightPointWithNoNodes(ptbRes);
      [
        ["a", 0],
        [",", 1],
        ["b", 2]
      ].forEach(([token, position]) => {
        it(`left part contains the "${token}" tokens`, () => {
          ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftPartOnly((leftPart) => {
            const idx = leftPart.range().start + position;
            expect(idx).toBeLessThan(args.length);
            expect(args[idx]?.content()).toEqual(token);
          }).visitRightPartOnly((_0) => {
          }).finish());
        });
      });
      it(`right part contains no tokens`, () => {
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftPartOnly((_0) => {
        }).visitRightPartOnly((rightPart) => {
          const { start, end } = rightPart.range();
          expect(start).toEqual(end);
        }).finish());
      });
    });
    function setupWithLeftPartCompletingTupleNode(ptbRes, fn) {
      ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftWithNode((node, _1) => {
        const compl = node.finish(AstIdentifierNode.make("b"));
        if (compl.type() === AstNode.types.tuple) {
          fn(compl);
        } else {
          fail();
        }
      }).visitRightPartOnly((_0) => {
      }).finish());
    }
    describe('handles general operator case "a, b"', () => {
      const args = [makeToken("a"), makeToken(","), makeToken("b")];
      const ptbRes = () => makePtbRes(...args);
      includeHasAResultExample(ptbRes);
      it("left part has incomplete node", () => {
        const { points, verifyAllHit } = ReachPoint.makeCollection(2);
        const [pt1, pt2] = points();
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftWithNode((_0, _1) => pt1.hitsAtExactly(1)).visitRightPartOnly((_0) => {
          pt2.hitsAtExactly(1);
        }).finish());
        expect(verifyAllHit()).toBeTruthy();
      });
      it("left part incomplete node, completes into a tuple node", () => {
        setupWithLeftPartCompletingTupleNode(ptbRes, (node) => {
          expect(node.count()).toEqual(2);
        });
      });
      it('left part incomplete node, completes into a tuple node, first is an "a" identifer', () => {
        setupWithLeftPartCompletingTupleNode(ptbRes, (node) => {
          let first = void 0;
          node.forEach((node2) => {
            first ??= AstFringeNode.downcast(node2).asString();
          });
          expect(first).toEqual("a");
        });
      });
    });
    describe('handles case operator across new line "a, \\n b \\n ...', () => {
      const args = [
        makeToken("a"),
        makeToken(","),
        makeToken("\n"),
        makeToken("b"),
        makeToken("\n"),
        makeToken("c")
      ];
      const ptbRes = () => makePtbRes(...args);
      includeHasAResultExample(ptbRes);
      includeHasLeftSideIncompleteNodeRightSidePartOnly(ptbRes);
      it("has left side has incomplete node, has new line adjusted range", () => {
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftWithNode((_0, part) => {
          const { start, end } = part.range();
          expect(start).toEqual(3);
          expect(end).toEqual(6);
        }).visitRightPartOnly((_0) => {
        }).finish());
      });
      it("has right side, has new line adjusted range", () => {
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftWithNode((_0, _1) => {
        }).visitRightPartOnly((rightPart) => {
          const { start, end } = rightPart.range();
          expect(start).toEqual(6);
          expect(end).toEqual(6);
        }).finish());
      });
    });
    function includeHasLeftSideIncompleteNodeRightSidePartOnly(ptbRes) {
      it("has left side has incomplete node, and nodeless right side", () => {
        const { points, verifyAllHit } = ReachPoint.makeCollection(2);
        const [pt1, pt2] = points();
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftWithNode((_0, _1) => pt1.hitsAtExactly(1)).visitRightPartOnly((_0) => {
          pt2.hitsAtExactly(1);
        }).finish());
        expect(verifyAllHit()).toBeTruthy();
      });
    }
    describe('handles function call case "f(...)..."', () => {
      describe(`a simple one parameter function call "f('a')"`, () => {
        const args = [
          makeToken("f"),
          makeToken("("),
          makeToken("'a'"),
          makeToken(")")
        ];
        const ptbRes = () => makePtbRes(...args);
        includeHasAResultExample(ptbRes);
        includeHasLeftSideIncompleteNodeRightSidePartOnly(ptbRes);
        it("has left side whose incomplete node that completes into a function", () => {
          ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftWithNode((node, _1) => {
            const completed = node.finish(AstIdentifierNode.make("c"));
            expect(completed.type()).toEqual(AstNode.types.functionCall);
          }).visitRightPartOnly((_0) => {
          }).finish());
        });
        it("has left side whose incomplete node that completes into the correct function", () => {
          ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftWithNode((node, _1) => {
            const completed = node.finish(AstIdentifierNode.make("c"));
            if (completed.type() !== AstNode.types.functionCall) {
              fail();
              return;
            }
            expect(completed.name).toEqual("f");
          }).visitRightPartOnly((_0) => {
          }).finish());
        });
        it("has left side, with one token", () => {
          ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftWithNode((_0, part) => {
            const { start, end } = part.range();
            expect(end - start).toEqual(1);
          }).visitRightPartOnly((_0) => {
          }).finish());
        });
        it("has empty right side", () => {
          ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftWithNode((_0, _1) => {
          }).visitRightPartOnly((rightPart) => {
            const { start, end } = rightPart.range();
            expect(start).toEqual(end);
          }).finish());
        });
      });
    });
    describe("let declaration", () => {
      const args = [
        makeToken("let"),
        makeToken("a"),
        makeToken("="),
        makeToken("'hello'")
      ];
      const ptbRes = () => makePtbRes(...args);
      includeHasAResultExample(ptbRes);
      includeHasLeftSideIncompleteNodeRightSidePartOnly(ptbRes);
      it("has left side whose incomplete node that completes into a let", () => {
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitLeftWithNode((node, _1) => {
          const completed = node.finish(AstIdentifierNode.make("c"));
          expect(completed.type()).toEqual(AstNode.types.letDeclaration);
        }).visitRightPartOnly((_0) => {
        }).finish());
      });
    });
    describe("unary operator starting on a new line", () => {
      const args = [
        makeToken("a"),
        makeToken("\n"),
        makeToken("let")
      ];
      const ptbRes = () => makePtbRes(...args);
      includeHasAResultExample(ptbRes);
      it("builds a node with an unprocessed right part", () => {
        const { hitsAtExactly, verifyHit } = ReachPoint.make();
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitRightWithPart((_0, _1) => {
          hitsAtExactly(1);
        }).finish());
        expect(verifyHit()).toBeTruthy();
      });
    });
    describe("simple cases", () => {
      it("handles a single string literal", () => {
        const ptbRes = () => make([makeToken("'a'")]).buildPart();
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitRightNodeOnly((node) => {
          const str = AstFringeNode.downcast(node).asString();
          expect(str).toEqual("a");
        }).finish());
      });
      it("handles new lines followed by nothing statements", () => {
        const res = make([makeToken("\n")]).buildPart();
        expect(EmptyNodeExpansion.hasCreated(res)).toBeTruthy();
      });
      it("handles empty statements", () => {
        const res = make([]).buildPart();
        expect(EmptyNodeExpansion.hasCreated(res)).toBeTruthy();
      });
      it("handles a lone token statement", () => {
        const args = [
          makeToken("a"),
          makeToken("\n")
        ];
        const ptbRes = () => make(args).buildPart();
        const { points, verifyAllHit } = ReachPoint.makeCollection(1);
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.makeOverrider(fail).visitRightWithPart((node, _1) => {
          const str = AstFringeNode.downcast(node).asString();
          points()[0].hitsAtExactly(1);
          expect(str).toEqual("a");
        }).finish());
        verifyAllHit();
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
    const makeForOperator = IncompleteNodeCreation.make;
    function makeAnyNode() {
      return AstIdentifierNode.make("");
    }
    function makeForOperatorWithAnyNodes(operator) {
      return makeForOperator(makeToken(operator), makeAnyNode())?.makeNode()?.finish(makeAnyNode());
    }
    it("defers creation of a function call", () => {
      const createdType = makeForOperatorWithAnyNodes("(")?.type();
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

  // src/tokenization/character_class.ts
  var CharacterClass = (() => {
    const { freeze: freeze21, assign } = Object;
    const classes = freeze21({
      numeric: Symbol(),
      alphabetic: Symbol(),
      operative: Symbol(),
      spacious: Symbol(),
      newLine: Symbol(),
      literal: Symbol()
    });
    function arrayAsCharacterSetFor(arr, characterClass) {
      return arr.map((k) => ({ [k]: characterClass })).reduce(assign);
    }
    const kCharacterToCharacterClass = assign(
      {},
      // arrayAsCharacterSetFor(
      //   [
      //     '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'
      //   ],
      //   classes.numeric),
      arrayAsCharacterSetFor(
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
      arrayAsCharacterSetFor(
        [
          " ",
          "	",
          "\r"
        ],
        classes.spacious
      ),
      arrayAsCharacterSetFor(
        [
          "'"
        ],
        classes.literal
      ),
      arrayAsCharacterSetFor(["\n"], classes.newLine)
    );
    function classOf(character) {
      if (character.length !== 1) {
        throw Error(`"${character}" is not one character`);
      }
      switch (character) {
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          return classes.numeric;
        default:
          break;
      }
      return kCharacterToCharacterClass[character] ?? classes.alphabetic;
    }
    return freeze21({
      classes,
      classOf
    });
  })();

  // src/tokenization/crawl_strategies.ts
  var CrawlStrategies = (() => {
    const { freeze: freeze21 } = Object;
    const { classes, classOf } = CharacterClass;
    function crawlAlphanumeric(input, start) {
      const { length } = input;
      for (let i = start + 1; i < length; ++i) {
        switch (classOf(input[i])) {
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
        if (classOf(input[i]) === classes.literal) {
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
        switch (classOf(input[i])) {
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
        if (classOf(input[i]) !== classes.newLine) {
          return i;
        }
      }
      return length;
    }
    function crawlNumeric(input, start) {
      const { length } = input;
      for (let i = start + 1; i < length; ++i) {
        if (classOf(input[i]) !== classes.numeric) {
          return i;
        }
      }
      return length;
    }
    return freeze21({
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
    const { freeze: freeze21 } = Object;
    const injections2 = freeze21({
      CrawlStrategies,
      characterClassOf: CharacterClass.classOf,
      characterClasses: CharacterClass.classes
    });
    function make(mInput, { CrawlStrategies: CrawlStrategies2, characterClassOf, characterClasses } = injections2) {
      const inst = freeze21({ reachedEnd, readToken, crawl });
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
    return freeze21({ make });
  })();

  // src/tokenization.ts
  var Tokenization = (() => {
    const { freeze: freeze21 } = Helpers;
    const injections2 = freeze21({ CharacterCrawler, TokenRange });
    function make({ CharacterCrawler: CharacterCrawler2, TokenRange: TokenRange2 } = injections2) {
      function tokenize(inp) {
        const rv = [];
        const crawler = CharacterCrawler2.make(inp);
        while (!crawler.reachedEnd()) {
          const readToken = crawler.crawl().readToken();
          rv.push(readToken);
        }
        return TokenRange2.makeStartingRange(rv);
      }
      return freeze21({ tokenize });
    }
    return freeze21({ make });
  })();

  // src/execution_context.ts
  var { freeze: freeze19, memoize: memoize3 } = Helpers;
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
          return freeze19({
            resolve: gotten.type,
            error: () => void 0
          });
        } else {
          return freeze19({
            resolve: () => void 0,
            error: memoize3(() => ({ message: `Undeclared variable "${identifierName}"` }))
          });
        }
      }
      return freeze19({
        lookUpIdentifierType,
        lookUpStringLiteralType: () => string_resolution,
        lookUpIntegerLiteralType: () => integer_resolution,
        declareVariable,
        getValueOfVariable,
        setVariable,
        getVariable
      });
    }
    return freeze19({ make });
  })();

  // src/persistent_stack.ts
  var PersistentStack = (() => {
    const { freeze: freeze21 } = Helpers;
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
      return freeze21({ push, pop, isEmpty });
    }
    return freeze21({ make });
  })();

  // src/interpreter.ts
  var { freeze: freeze20 } = Object;
  var LetVisitor = (() => {
    function make(context) {
      const inst = freeze20({
        visitFunctionCall: (_0) => {
        },
        visitLetDeclaration: (_0) => {
        },
        visitBinaryOperation: (op, lhs, rhs) => {
          const lhsName = AstFringeNode.downcast(lhs).asString();
          const rhsRes = rhs.executionType(context);
          const rhsType = rhsRes.resolve();
          if (!rhsType) {
            throw Error(`Cannot figure out type of function call "${op}"`);
          }
          context.declareVariable(lhsName).setType(rhsType);
        },
        visitIdentifier: (_0) => {
        }
      });
      return inst;
    }
    return freeze20({ make });
  })();
  var injections = freeze20({ putsFunction: console.log });
  var Interpreter = freeze20({
    make: (context = ExecutionContext.make(), { putsFunction } = injections) => {
      const mStack = PersistentStack.make(ContextVariable.make);
      const mLetVisitor = LetVisitor.make(context);
      const inst = freeze20({
        visitFunctionCall,
        visitLetDeclaration,
        visitBinaryOperation,
        visitIdentifier
      });
      function visitFunctionCall(node) {
        if (node.name === "puts") {
          node.arguments.forEach((node2) => {
            const cv = valueOf(node2);
            putsFunction(cv.asString());
          });
        }
      }
      function visitLetDeclaration(dec, lhs) {
        lhs.visit(mLetVisitor);
        lhs.visit(inst);
      }
      function valueOf(node) {
        const evalNode = AstEvaluatableNode.tryDowncast(node);
        if (evalNode) {
          return evalNode.evaluate(context.getVariable);
        }
        return mStack.pop();
      }
      function visitBinaryOperation(op, lhs, rhs) {
        lhs.visit(inst);
        rhs.visit(inst);
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
        const lhsVal = valueOf(lhs);
        const rhsVal = valueOf(rhs);
        builtIn(mStack, lhsVal, rhsVal);
      }
      function visitIdentifier(_0) {
      }
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
      const injections2 = { putsFunction };
      return { injections: injections2, printedStrings };
    }
    function makeWithInjections(putsFunction, context) {
      return Interpreter.make(context ?? ExecutionContext.make(), { putsFunction });
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
      const { classOf, classes } = CharacterClass;
      it("numeric", () => {
        expect(classOf("1")).toEqual(classes.numeric);
      });
      it("alphabetic", () => {
        expect(classOf("q")).toEqual(classes.alphabetic);
      });
      it("operative", () => {
        expect(classOf(",")).toEqual(classes.operative);
      });
      it("spacious", () => {
        expect(classOf("	")).toEqual(classes.spacious);
      });
      it("new line", () => {
        expect(classOf("\n")).toEqual(classes.newLine);
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
})();
