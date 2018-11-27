HOT-IMPORT
----------

[![NPM Version](https://badge.fury.io/js/hot-import.svg)](https://badge.fury.io/js/hot-import) [![Downloads](http://img.shields.io/npm/dm/hot-import.svg?style=flat-square)](https://npmjs.org/package/hot-import) [![Powered by TypeScript](https://img.shields.io/badge/Powered%20By-TypeScript-blue.svg)](https://www.typescriptlang.org/) [![node](https://img.shields.io/node/v/hot-import.svg?maxAge=604800)](https://nodejs.org/) 

Hot Module Replacement(HMR) for Node.js

![Hot Module Reload](https://huan.github.io/hot-import/images/reload.png)

_Hot Module Replacement_ (HMR) is a feature to inject updated modules into the active runtime. It's like LiveReload for every module. 

> HMR exchanges, adds, or removes modules while an application is running, without a full reload. This can significantly speed up development in a few ways:
> * Retain application state which is lost during a full reload.
> * Save valuable development time by only updating what's changed.
>
> -- WebPack Concepts - <https://webpack.js.org/concepts/hot-module-replacement/>

`hot-import` is a NPM module that enable you to do HMR with just one line of code.

INSTALL
-------

```shell
$ npm install hot-import
```

USAGE
-----

Talk is cheap, show me the code!

### Core Code

```ts
import hotImport from 'hot-import'
const hotMod = await hotImport('./my-module')
```

### Full Example

```ts
import * as assert  from 'assert'
import * as fs      from 'fs'
import * as path    from 'path'

import hotImport  from 'hot-import'

async function main() {
  const MODULE_CODE_42 = 'module.exports = () => 42'
  const MODULE_CODE_17 = 'module.exports.default = () => 17'

  const MODULE_FILE = path.join(__dirname, 't.js')
  
  fs.writeFileSync(MODULE_FILE, MODULE_CODE_42)
  const hotMod = await hotImport(MODULE_FILE)

  const fourtyTwo = hotMod()
  console.log('fourtyTwo =', fourtyTwo)  // Output: fourtyTwo = 42
  assert(fourtyTwo === 42, 'first get 42')

  fs.writeFileSync(MODULE_FILE, MODULE_CODE_17)
  await new Promise(setImmediate) // wait io event loop finish

  const sevenTeen = hotMod()
  console.log('sevenTeen =', sevenTeen)  // Output sevenTeen = 17
  assert(sevenTeen === 17, 'get 17 after file update & hot reloaded')

  await hotImport(MODULE_FILE, false) // stop hot watch
}

main()
.catch(console.error)
```

Output:

```shell
42
17
```

The above code is in the `example/` directory. Npm script `demo` will run it for you:

```shell
$ git clone git@github.com:zixia/hot-import.git
$ cd hot-import
$ npm install
$ npm run demo
```

API
---

The only API in this module is `hotImport()`, it will import the module and reload it when it changes.

### 1. `hotImport(modulePath: string): Promise<any>`

Import a module from `modulePath` as a Hot Module.

```ts
// load './mod' as a hot module
const hotMod = await hotImport('./mod')

// ... do staffs like the following five ways
// const c = hotMod()         // 1. default export is a Function
// const c = new hotMod()     // 2. default export is a Class
// const c = hotMod.func()    // 3. export is a { Function }
// const c = new hotMod.cls() // 4. export is a { Class }
// const c = hotMod.constant  // 5. export is a { const }

// make module cold, not to watch/reload anymore.
await hotImport('./mod', false)
```

**Attention**: 
1. Do `const hotMod = await hotImport('./file')`; Do NOT `const { mod } = await hotImport('./file')`
1. Do `const v = hotMod.method()` to call a method inside hot module;
1. Do `console.log(hotMod.constant)` to get a value inside hot module;
1. Do `const c = new hotMod.cls()` to instanciate a new instance of class;

### 2. `hotImport(modulePath: string, watch: boolean): Promise<void>`

Turn the module from `modulePath` to be _hot_ or _cold_.

1. If `watch` is `true`, then HMR will be enabled.
1. If `watch` is `false`, then HMR will be disabled.

### 3. `hotImport(null, watch: boolean): Promise<void>`

Turn all the modules that managed by `hotImport` to be _hot_ or _cold_.

TEST
----

[![Build Status](https://travis-ci.com/huan/hot-import.svg?branch=master)](https://travis-ci.com/huan/hot-import) [![Windows Build status](https://img.shields.io/appveyor/ci/zixia/hot-import/master.svg?label=Windows)](https://ci.appveyor.com/project/zixia/hot-import) [![Greenkeeper badge](https://badges.greenkeeper.io/huan/hot-import.svg)](https://greenkeeper.io/)

This module is fully tested under Linux/Mac/Windows.

```shell
$ npm test

> hot-import@0.0.24 test /home/zixia/git/hot-import
> npm run lint && npm run test:unit


> hot-import@0.0.24 lint /home/zixia/git/hot-import
> npm run check-node-version && tslint --version && tslint --project tsconfig.json "{src,tests}/**/*.ts" --exclude "tests/fixtures/**" --exclude "dist/" && npm run clean && tsc --noEmit


> hot-import@0.0.24 check-node-version /home/zixia/git/hot-import
> check-node-version --node ">= 7"

node: 8.5.0
npm: 5.3.0
yarn: not installed
5.7.0

> hot-import@0.0.24 clean /home/zixia/git/hot-import
> shx rm -fr dist/*


> hot-import@0.0.24 test:unit /home/zixia/git/hot-import
> blue-tape -r ts-node/register -r source-map-support/register "src/**/*.spec.ts" "tests/**/*.spec.ts"

TAP version 13
# callerResolve()
# relative file path
ok 1 should turn relative to absolute
# absolute file path
ok 2 should keep absolute as it is
# newCall()
ok 3 should instanciate class with constructor arguments
# hotImport()
# class module(export=)
ok 4 should get expected values from instance of class in module
ok 5 should import module class with right id:1
ok 6 should get same module file for fixtures(change file content only)
ok 7 should get expected values from instance of class in module
ok 8 should import module class with right id:2
# variable module(export const answer=)
ok 9 should get expected values from variable in module
ok 10 should get same module file for fixtures(change file content only)
ok 11 should get expected values from variable in module
# importFile()
# const value
ok 12 should import file right with returned value original
# class
ok 13 should instanciated class with constructor argument
ok 14 should import module class with right id
# refreshImport()
ok 15 should be refreshed to new value
# purgeRequireCache()
ok 16 should get returnValue from module
ok 17 should keep value in require cache
ok 18 should get returnValue again after purge
ok 19 should no KEY exists any more
# cloneProperties()
# object
ok 20 should clone the text property
# class
ok 21 should clone the prototype for class
# hotImport
ok 22 should get 42 for meaning of life
# callerResolve
ok 23 should resolve based on the consumer file path
# 1/4. fs.writeFileSync then fs.writeFile
ok 24 should monitored file change event at least once
ok 25 should monitored file change event at most twice
ok 26 should instanciated a watcher
# 2/4. fs.writeFileSync then fs.writeFileSync
ok 27 should instanciated a watcher
# 3/4. fs.writeFile then fs.writeFile
ok 28 should monitored 1 change event
ok 29 should monitored 0 rename event
ok 30 should instanciated a watcher
# 4/4. fs.writeFile then fs.writeFileSync
ok 31 should instanciated a watcher
# fixtures
ok 32 should monitored file change event at least once
ok 33 should monitored file change event at most twice
ok 34 should not monitored file rename event
ok 35 should instanciated a watcher

1..35
# tests 35
# pass  35

# ok
```

INSPIRED
--------

This module is highly inspired by [@gcaufy](https://github.com/gcaufy) via his blog: [给微信机器人添加热重启功能](http://blog.chatie.io/developer/2017/03/20/added-hot-reload-for-bots.html)

### See Also

1. [Support hot-reload for Wechaty events listeners](https://github.com/Chatie/wechaty/issues/820)
1. [make js file hot-reload when use hot-require to load the file](https://github.com/rayosu/hot-require)
1. [Hot Module Replacement](https://webpack.js.org/concepts/hot-module-replacement/)

RELEASE NOTES
---------

### v0.1 Oct, 2017

1. Passed all the unit tests under Windows/Linux/Mac
1. Support TypeScript typings
1. Initial release

AUTHOR
------

Huan LI \<zixia\@zixia.net\> \(http://linkedin.com/in/zixia\)

<a href="http://stackoverflow.com/users/1123955/zixia">
  <img src="http://stackoverflow.com/users/flair/1123955.png" width="208" height="58" alt="profile for zixia at Stack Overflow, Q&amp;A for professional and enthusiast programmers" title="profile for zixia at Stack Overflow, Q&amp;A for professional and enthusiast programmers">
</a>

COPYRIGHT & LICENSE
-------------------

* Code & Docs © 2017 Huan LI \<zixia\@zixia.net\>
* Code released under the Apache-2.0 License
* Docs released under Creative Commons
