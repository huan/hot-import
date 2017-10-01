HOT-IMPORT
----------

[![Powered by TypeScript](https://img.shields.io/badge/Powered%20By-TypeScript-blue.svg)](https://www.typescriptlang.org/) [![node](https://img.shields.io/node/v/hot-import.svg?maxAge=604800)](https://nodejs.org/)

[![Build Status](https://travis-ci.org/zixia/hot-import.svg?branch=master)](https://travis-ci.org/zixia/hot-import) [![Windows Build status](https://img.shields.io/appveyor/ci/zixia/hot-import/master.svg?label=Windows)](https://ci.appveyor.com/project/zixia/hot-import) [![NPM Version](https://badge.fury.io/js/hot-import.svg)](https://badge.fury.io/js/hot-import) [![Downloads](http://img.shields.io/npm/dm/hot-import.svg?style=flat-square)](https://npmjs.org/package/hot-import)

Hot Module Re-Import on Change in Node.js

![Hot Module Reload](https://zixia.github.io/hot-import/images/reload.png)

Reload your module dynamically, automatically after file changes.

INSTALL
-------

```shell
$ npm install hot-import
```

USAGE
-----

Talk is cheap, show me the code!

```ts
import * as assert  from 'assert'
import * as fs      from 'fs'
import * as path    from 'path'

import hotImport  from '../'

async function main() {
  const MODULE_CODE_42 = 'exports.answer = () => 42'
  const MODULE_CODE_17 = 'exports.answer = () => 17'

  const MODULE_FILE = path.join(__dirname, 't.js')

  fs.writeFileSync(MODULE_FILE, MODULE_CODE_42)
  const mod = await hotImport(MODULE_FILE)

  const fourtyTwo = mod.answer()
  console.log('fourtyTwo = ', fourtyTwo)  // Output: fourtyTwo = 42
  assert(fourtyTwo === 42, 'first get 42')

  fs.writeFileSync(MODULE_FILE, MODULE_CODE_17)
  await new Promise(setImmediate) // wait io event loop finish

  const sevenTeen = mod.answer()
  console.log('sevenTeen = ', sevenTeen)  // Output sevenTeen = 17
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

### `hotImport(filePath: string, hot = true): Promise<any>`

```ts
// load './mod' as a hot module
const hotMod = await hotImport('./mod')

// ... do staffs

// make module cold, not to watch/reload anymore.
await hotImport('./mod', false)
```

**Attention**: 
1. Do `const hotMod = await hotImport()`; Do NOT `const { mod } = await hotImport()`
1. Do `hotMod.method()` to call a method inside hot module; Do NOT `const method = hotMod.method; method()`

TEST
----

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

SEE ALSO
--------
1. [Support hot-reload for Wechaty events listeners](https://github.com/Chatie/wechaty/issues/820)
1. [给微信机器人添加热重启功能](http://blog.chatie.io/developer/2017/03/20/added-hot-reload-for-bots.html)
1. [make js file hot-reload when use hot-require to load the file](https://github.com/rayosu/hot-require)

AUTHOR
------

Huan LI zixia@zixia.net http://linkedin.com/in/zixia

<a href="http://stackoverflow.com/users/1123955/zixia">
  <img src="http://stackoverflow.com/users/flair/1123955.png" width="208" height="58" alt="profile for zixia at Stack Overflow, Q&amp;A for professional and enthusiast programmers" title="profile for zixia at Stack Overflow, Q&amp;A for professional and enthusiast programmers">
</a>

COPYRIGHT & LICENSE
-------------------

* Code & Docs © 2017 Huan LI \<zixia@zixia.net\>
* Code released under the Apache-2.0 License
* Docs released under Creative Commons
