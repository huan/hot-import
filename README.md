HOT-IMPORT
----------

[![Powered by TypeScript](https://img.shields.io/badge/Powered%20By-TypeScript-blue.svg)](https://www.typescriptlang.org/)

[![Build Status](https://travis-ci.org/zixia/hot-import.svg?branch=master)](https://travis-ci.org/zixia/hot-import) [![NPM Version](https://badge.fury.io/js/hot-import.svg)](https://badge.fury.io/js/hot-import) [![Downloads](http://img.shields.io/npm/dm/hot-import.svg?style=flat-square)](https://npmjs.org/package/hot-import)

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
  const MODULE_CODE_42 = 'export const answer = () => 42'
  const MODULE_CODE_17 = 'export const answer = () => 17'

  const MODULE_FILE = path.join(__dirname, 'mod.ts')

  fs.writeFileSync(MODULE_FILE, MODULE_CODE_42)
  const mod = await hotImport(MODULE_FILE)

  const fourtyTwo = mod.answer()
  assert(fourtyTwo === 42, 'first get 42')
  console.log(fourtyTwo)  // Output: 42

  fs.writeFileSync(MODULE_FILE, MODULE_CODE_17)
  await new Promise(setImmediate) // wait io event loop finish

  const sevenTeen = mod.answer()
  assert(sevenTeen === 17, 'get 17 after file update & hot reloaded')
  console.log(sevenTeen)  // Output 17

  await hotImport(MODULE_FILE, false) // stop hot watch
}

main()
.catch(console.error)
```

The above code is in the `example/` directory. Npm script `demo` will run it for you:

```shell
$ git clone git@github.com:zixia/hot-import.git
$ cd hot-import
$ npm install
$ npm run demo
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
