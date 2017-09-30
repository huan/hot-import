import * as assert  from 'assert'
import * as fs      from 'fs'
import * as path    from 'path'

import hotImport  from '../'

// import { log } from 'brolog'
// log.level('silly')

async function main() {
  const MODULE_CODE_42 = 'exports.answer = () => 42'
  const MODULE_CODE_17 = 'exports.answer = () => 17'

  const MODULE_FILE = path.join(__dirname, 't.js')

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
