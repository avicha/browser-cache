var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
var defaultOpts = {
  driver: "memory"
};
function mitt(n) {
  return { all: n = n || /* @__PURE__ */ new Map(), on: function(t, e) {
    var i = n.get(t);
    i ? i.push(e) : n.set(t, [e]);
  }, off: function(t, e) {
    var i = n.get(t);
    i && (e ? i.splice(i.indexOf(e) >>> 0, 1) : n.set(t, []));
  }, emit: function(t, e) {
    var i = n.get(t);
    i && i.slice().map(function(n2) {
      n2(e);
    }), (i = n.get("*")) && i.slice().map(function(n2) {
      n2(t, e);
    });
  } };
}
class EventListener {
  constructor() {
    __publicField(this, "mitt", new mitt());
  }
  get all() {
    return this.mitt.all;
  }
  $on() {
    return this.mitt.on.apply(this, arguments);
  }
  $off() {
    return this.mitt.off.apply(this, arguments);
  }
  $emit() {
    return this.mitt.emit.apply(this, arguments);
  }
}
class BaseStore extends EventListener {
  constructor(opts = {}) {
    super();
    __publicField(this, "opts");
    __publicField(this, "isReady", false);
    this.opts = opts;
    this.isReady = false;
  }
  existsKey() {
    throw new Error("please implement the existsKey method for this driver.");
  }
  get() {
    throw new Error("please implement the get method for this driver.");
  }
  set() {
    throw new Error("please implement the set method for this driver.");
  }
}
const StoreResult = {
  OK: Symbol("OK"),
  KEY_NOT_EXISTS: Symbol("KEY_NOT_EXISTS"),
  KEY_EXPIRED: Symbol("KEY_EXPIRED"),
  JSON_PARSE_ERROR: Symbol("JSON_PARSE_ERROR"),
  NX_SET_NOT_PERFORMED: Symbol("NX_SET_NOT_PERFORMED"),
  XX_SET_NOT_PERFORMED: Symbol("XX_SET_NOT_PERFORMED")
};
class SyncStore extends BaseStore {
  constructor(opts) {
    super(opts);
    this.isReady = true;
    this.$emit("ready");
  }
  keyValueGet() {
    throw new Error("please implement the keyValueGet method for this driver.");
  }
  keyValueSet() {
    throw new Error("please implement the keyValueSet method for this driver.");
  }
  existsKey() {
    throw new Error("please implement the existsKey method for this driver.");
  }
  get(key) {
    const valueStr = this.keyValueGet(key);
    if (valueStr) {
      try {
        const valueObj = JSON.parse(valueStr);
        if (valueObj.expiredAt) {
          if (valueObj.expiredAt > Date.now()) {
            return valueObj.value;
          } else {
            this.$emit("cacheExpired", key);
            return void 0;
          }
        } else {
          return valueObj.value;
        }
      } catch (error) {
        window.console.debug("get key json parse error", error);
        return void 0;
      }
    }
  }
  set(key, value, options = {}) {
    const {
      EX,
      PX,
      EXAT,
      PXAT,
      NX = false,
      XX = false,
      GET = false
    } = options;
    let expiredAt, maxAge;
    if (EX && typeof EX === "number" && EX > 0) {
      expiredAt = Date.now() + EX * 1e3;
    }
    if (PX && typeof PX === "number" && PX > 0) {
      expiredAt = Date.now() + PX;
    }
    if (EXAT && typeof EXAT === "number" && EXAT > 0) {
      expiredAt = EXAT * 1e3;
    }
    if (PXAT && typeof PXAT === "number" && PXAT > 0) {
      expiredAt = PXAT;
    }
    if (expiredAt) {
      maxAge = Math.max(expiredAt - Date.now(), 0);
    }
    if (NX || XX || GET) {
      const oldValue = this.get(key);
      const existsKey = this.existsKey(key);
      if (NX && existsKey) {
        if (GET) {
          return oldValue;
        } else {
          return StoreResult.NX_SET_NOT_PERFORMED;
        }
      }
      if (XX && !existsKey) {
        if (GET) {
          return oldValue;
        } else {
          return StoreResult.XX_SET_NOT_PERFORMED;
        }
      }
      this.keyValueSet(key, JSON.stringify({ value, expiredAt, maxAge }));
      if (GET) {
        return oldValue;
      } else {
        return StoreResult.OK;
      }
    } else {
      this.keyValueSet(key, JSON.stringify({ value, expiredAt, maxAge }));
      return StoreResult.OK;
    }
  }
}
class LocalStorageStore extends SyncStore {
  keyValueGet(key) {
    return localStorage.getItem(key);
  }
  keyValueSet(key, value) {
    localStorage.setItem(key, value);
  }
  existsKey(key) {
    if (localStorage.getItem(key)) {
      return true;
    } else {
      return false;
    }
  }
}
__publicField(LocalStorageStore, "driver", "localStorage");
class MemoryStore extends SyncStore {
  constructor() {
    super(...arguments);
    __publicField(this, "data", /* @__PURE__ */ new Map());
  }
  keyValueGet(key) {
    return this.data.get(key);
  }
  keyValueSet(key, value) {
    this.data.set(key, value);
  }
  existsKey(key) {
    if (this.data.has(key)) {
      return true;
    } else {
      return false;
    }
  }
}
__publicField(MemoryStore, "driver", "memory");
class SessionStorageStore extends SyncStore {
  keyValueGet(key) {
    return sessionStorage.getItem(key);
  }
  keyValueSet(key, value) {
    sessionStorage.setItem(key, value);
  }
  existsKey(key) {
    if (sessionStorage.getItem(key)) {
      return true;
    } else {
      return false;
    }
  }
}
__publicField(SessionStorageStore, "driver", "sessionStorage");
/*! js-cookie v3.0.1 | MIT */
function assign(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];
    for (var key in source) {
      target[key] = source[key];
    }
  }
  return target;
}
var defaultConverter = {
  read: function(value) {
    if (value[0] === '"') {
      value = value.slice(1, -1);
    }
    return value.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
  },
  write: function(value) {
    return encodeURIComponent(value).replace(/%(2[346BF]|3[AC-F]|40|5[BDE]|60|7[BCD])/g, decodeURIComponent);
  }
};
function init(converter, defaultAttributes) {
  function set(key, value, attributes) {
    if (typeof document === "undefined") {
      return;
    }
    attributes = assign({}, defaultAttributes, attributes);
    if (typeof attributes.expires === "number") {
      attributes.expires = new Date(Date.now() + attributes.expires * 864e5);
    }
    if (attributes.expires) {
      attributes.expires = attributes.expires.toUTCString();
    }
    key = encodeURIComponent(key).replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent).replace(/[()]/g, escape);
    var stringifiedAttributes = "";
    for (var attributeName in attributes) {
      if (!attributes[attributeName]) {
        continue;
      }
      stringifiedAttributes += "; " + attributeName;
      if (attributes[attributeName] === true) {
        continue;
      }
      stringifiedAttributes += "=" + attributes[attributeName].split(";")[0];
    }
    return document.cookie = key + "=" + converter.write(value, key) + stringifiedAttributes;
  }
  function get(key) {
    if (typeof document === "undefined" || arguments.length && !key) {
      return;
    }
    var cookies = document.cookie ? document.cookie.split("; ") : [];
    var jar = {};
    for (var i = 0; i < cookies.length; i++) {
      var parts = cookies[i].split("=");
      var value = parts.slice(1).join("=");
      try {
        var foundKey = decodeURIComponent(parts[0]);
        jar[foundKey] = converter.read(value, foundKey);
        if (key === foundKey) {
          break;
        }
      } catch (e) {
      }
    }
    return key ? jar[key] : jar;
  }
  return Object.create({
    set,
    get,
    remove: function(key, attributes) {
      set(key, "", assign({}, attributes, {
        expires: -1
      }));
    },
    withAttributes: function(attributes) {
      return init(this.converter, assign({}, this.attributes, attributes));
    },
    withConverter: function(converter2) {
      return init(assign({}, this.converter, converter2), this.attributes);
    }
  }, {
    attributes: { value: Object.freeze(defaultAttributes) },
    converter: { value: Object.freeze(converter) }
  });
}
var api = init(defaultConverter, { path: "/" });
class CookieStore extends SyncStore {
  keyValueGet(key) {
    return api.get(key);
  }
  keyValueSet(key, value) {
    api.set(key, value);
  }
  existsKey(key) {
    if (api.get(key)) {
      return true;
    } else {
      return false;
    }
  }
}
__publicField(CookieStore, "driver", "cookie");
class AsyncStore extends BaseStore {
  constructor(opts) {
    super(opts);
  }
  keyValueGet() {
    return Promise.reject(new Error("please implement the keyValueGet method for this driver."));
  }
  keyValueSet() {
    return Promise.reject(new Error("please implement the keyValueSet method for this driver."));
  }
  existsKey() {
    return Promise.reject(new Error("please implement the existsKey method for this driver."));
  }
  get(key) {
    return new Promise((resolve, reject) => {
      this.keyValueGet(key).then((valueStr) => {
        if (valueStr) {
          try {
            const valueObj = JSON.parse(valueStr);
            if (valueObj.expiredAt) {
              if (valueObj.expiredAt > Date.now()) {
                resolve(valueObj.value);
              } else {
                this.$emit("cacheExpired", key);
                resolve();
              }
            } else {
              resolve(valueObj.value);
            }
          } catch (error) {
            window.console.debug("get key json parse error", error);
            resolve();
          }
        } else {
          resolve();
        }
      }).catch((e) => {
        reject(e);
      });
    });
  }
  set(key, value, options = {}) {
    const {
      EX,
      PX,
      EXAT,
      PXAT,
      NX = false,
      XX = false,
      GET = false
    } = options;
    let expiredAt, maxAge;
    if (EX && typeof EX === "number" && EX > 0) {
      expiredAt = Date.now() + EX * 1e3;
    }
    if (PX && typeof PX === "number" && PX > 0) {
      expiredAt = Date.now() + PX;
    }
    if (EXAT && typeof EXAT === "number" && EXAT > 0) {
      expiredAt = EXAT * 1e3;
    }
    if (PXAT && typeof PXAT === "number" && PXAT > 0) {
      expiredAt = PXAT;
    }
    if (expiredAt) {
      maxAge = Math.max(expiredAt - Date.now(), 0);
    }
    return new Promise((resolve, reject) => {
      if (NX || XX || GET) {
        const p1 = this.get(key);
        const p2 = this.existsKey(key);
        Promise.all([p1, p2]).then(([oldValue, existsKey]) => {
          if (NX && existsKey) {
            if (GET) {
              return resolve(oldValue);
            } else {
              return resolve(StoreResult.NX_SET_NOT_PERFORMED);
            }
          }
          if (XX && !existsKey) {
            if (GET) {
              return resolve(oldValue);
            } else {
              return resolve(StoreResult.XX_SET_NOT_PERFORMED);
            }
          }
          this.keyValueSet(key, JSON.stringify({ value, expiredAt, maxAge })).then(() => {
            if (GET) {
              return resolve(oldValue);
            } else {
              return resolve(StoreResult.OK);
            }
          }).catch((e) => {
            reject(e);
          });
        }).catch((e) => {
          reject(e);
        });
      } else {
        this.keyValueSet(key, JSON.stringify({ value, expiredAt, maxAge })).then(() => {
          return resolve(StoreResult.OK);
        }).catch((e) => {
          reject(e);
        });
      }
    });
  }
}
class IndexedDBStore extends AsyncStore {
  constructor(opts) {
    var _a, _b, _c;
    super(opts);
    __publicField(this, "dbName", "browser-cache");
    __publicField(this, "objectStoreName", "browser-cache");
    __publicField(this, "dbVersion", 1);
    __publicField(this, "dbConnection");
    this.isReady = false;
    if ((_a = this.opts) == null ? void 0 : _a.dbName) {
      this.dbName = this.opts.dbName;
    }
    if ((_b = this.opts) == null ? void 0 : _b.objectStoreName) {
      this.objectStoreName = this.opts.objectStoreName;
    }
    if ((_c = this.opts) == null ? void 0 : _c.dbVersion) {
      this.dbVersion = this.opts.dbVersion;
    }
    this.connectDB().then(() => {
      this.initObjectStore();
    });
  }
  connectDB() {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.dbName, this.dbVersion);
      request.onerror = () => {
        window.console.error(`Database ${this.dbName} init occurs error`, request.result);
        reject(request.result);
      };
      request.onsuccess = () => {
        this.dbConnection = request.result;
        window.console.debug(`Database ${this.dbName} initialised.`);
        resolve(this.dbConnection);
      };
      request.onupgradeneeded = (event) => {
        this.dbConnection = event.target.result;
        window.console.debug("Database version upgraded success.");
        resolve(this.dbConnection);
      };
    });
  }
  initObjectStore() {
    return new Promise((resolve, reject) => {
      if (this.dbConnection) {
        if (!this.dbConnection.objectStoreNames.contains(this.objectStoreName)) {
          this.dbConnection.createObjectStore(this.objectStoreName, {
            keyPath: "key"
          });
        }
        this.isReady = true;
        this.$emit("ready");
        resolve();
      } else {
        const error = new Error(`Database ${this.dbName} connection is not initialised.`);
        window.console.error(error);
        reject(error);
      }
    });
  }
  keyValueGet(key) {
    return new Promise((resolve, reject) => {
      if (this.dbConnection) {
        const request = this.dbConnection.transaction([this.objectStoreName], "readonly").objectStore(this.objectStoreName).get(key);
        request.onerror = () => {
          window.console.error("Database keyValueGet occurs error", request.result);
          reject(request.result);
        };
        request.onsuccess = () => {
          var _a;
          resolve((_a = request.result) == null ? void 0 : _a.value);
        };
      } else {
        const error = new Error(`Database ${this.dbName} connection is not initialised.`);
        window.console.error(error);
        reject(error);
      }
    });
  }
  keyValueSet(key, value) {
    return new Promise((resolve, reject) => {
      if (this.dbConnection) {
        const request = this.dbConnection.transaction([this.objectStoreName], "readwrite").objectStore(this.objectStoreName).put({ key, value });
        request.onerror = () => {
          window.console.error("Database keyValueSet occurs error", request.result);
          reject(request.result);
        };
        request.onsuccess = () => {
          var _a;
          resolve((_a = request.result) == null ? void 0 : _a.value);
        };
      } else {
        const error = new Error(`Database ${this.dbName} connection is not initialised.`);
        window.console.error(error);
        reject(error);
      }
    });
  }
  existsKey(key) {
    return new Promise((resolve, reject) => {
      if (this.dbConnection) {
        const request = this.dbConnection.transaction([this.objectStoreName], "readonly").objectStore(this.objectStoreName).count(key);
        request.onerror = () => {
          window.console.error("Database existsKey occurs error", request.result);
          reject(request.result);
        };
        request.onsuccess = () => {
          resolve(!!request.result);
        };
      } else {
        const error = new Error(`Database ${this.dbName} connection is not initialised.`);
        window.console.error(error);
        reject(error);
      }
    });
  }
}
__publicField(IndexedDBStore, "driver", "indexedDB");
const systemStores = {};
for (const store of [
  MemoryStore,
  LocalStorageStore,
  SessionStorageStore,
  CookieStore,
  IndexedDBStore
]) {
  systemStores[store.driver] = store;
}
const externalStores = {};
const registerStore = (store) => {
  if (Object.getPrototypeOf(store) === BaseStore) {
    if (store.driver && typeof store.driver === "string") {
      externalStores[store.driver] = store;
    } else {
      throw new Error("please input the driver name.");
    }
  }
};
const getSupportedDriverList = () => {
  let supportedDriverList = ["memory"];
  if (window.localStorage && systemStores.localStorage) {
    supportedDriverList.push("localStorage");
  }
  if (window.sessionStorage && systemStores.sessionStorage) {
    supportedDriverList.push("sessionStorage");
  }
  if (window.document.cookie && systemStores.cookie) {
    supportedDriverList.push("cookie");
  }
  if (window.indexedDB && systemStores.indexedDB) {
    supportedDriverList.push("indexedDB");
  }
  supportedDriverList = supportedDriverList.concat(Object.keys(externalStores));
  return supportedDriverList;
};
const getStoreClass = (driver) => {
  return systemStores[driver] || externalStores[driver];
};
class BrowserCache extends EventListener {
  constructor(driver, opts) {
    super();
    __publicField(this, "opts");
    __publicField(this, "__init", false);
    __publicField(this, "driver");
    __publicField(this, "store");
    const suportedDriverList = getSupportedDriverList();
    if (!driver && !opts) {
      opts = { ...defaultOpts };
    } else {
      if (driver) {
        if (suportedDriverList.includes(driver)) {
          if (Object.prototype.toString.call(opts) === "[object Object]") {
            opts = { ...defaultOpts, driver, ...opts };
          } else {
            opts = { ...defaultOpts, driver };
          }
        } else {
          if (Object.prototype.toString.call(driver) === "[object Object]" && suportedDriverList.includes(driver.driver)) {
            opts = { ...defaultOpts, ...driver };
          } else {
            throw new Error("please input the correct driver param as the first param or in the opts params.");
          }
        }
      } else {
        throw new Error("please input the driver as first param.");
      }
    }
    if (opts && opts.driver) {
      this.opts = opts;
      this.initDriver();
    } else {
      throw new Error("please input the driver as first param.");
    }
  }
  initDriver() {
    const suportedDriverList = getSupportedDriverList();
    if (this.opts && this.opts.driver && suportedDriverList.includes(this.opts.driver)) {
      this.__init = false;
      const StoreClass = getStoreClass(this.opts.driver);
      this.store = new StoreClass(this.opts);
      this.store.$on("ready", () => {
        this.__init = true;
        this.driver = this.opts.driver;
        this.$emit("ready");
      });
    }
  }
  setDriver(driver) {
    this.opts.driver = driver;
    this.initDriver();
  }
  existsKey() {
    return this.store.existsKey.apply(this.store, arguments);
  }
  get() {
    return this.store.get.apply(this.store, arguments);
  }
  set() {
    return this.store.set.apply(this.store, arguments);
  }
}
export { AsyncStore, BaseStore, BrowserCache, StoreResult, SyncStore, registerStore };
