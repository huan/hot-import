HOT-IMPORT
----------
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
import hotImport  from 'hot-import'

import * as fs    from 'fs'

const MODULE_CODE_42 = 'export default const test = () => 42'
const MODULE_CODE_17 = 'export default const test = () => 17'

fs.writeFileSync('./mod.js', MODULE_CODE_42)

const mod = hotImport('./mod')
console.log(mod())  // Output: 42

fs.writeFileSync('./mod.js', MODULE_CODE_17)

console.log(mod())  // Output: 17
```

SEE ALSO
--------
1. [Support hot-reload for Wechaty events listeners](https://github.com/Chatie/wechaty/issues/820)
1. [给微信机器人添加热重启功能](http://blog.chatie.io/developer/2017/03/20/added-hot-reload-for-bots.html)
1. [make js file hot-reload when use hot-require to load the file](https://github.com/rayosu/hot-require)

AUTHOR
------

Huan LI \<zixia@zixia.net\> (http://linkedin.com/in/zixia)

<a href="http://stackoverflow.com/users/1123955/zixia">
  <img src="http://stackoverflow.com/users/flair/1123955.png" width="208" height="58" alt="profile for zixia at Stack Overflow, Q&amp;A for professional and enthusiast programmers" title="profile for zixia at Stack Overflow, Q&amp;A for professional and enthusiast programmers">
</a>

COPYRIGHT & LICENSE
-------------------

* Code & Docs © 2017 Huan LI \<zixia@zixia.net\>
* Code released under the Apache-2.0 License
* Docs released under Creative Commons
