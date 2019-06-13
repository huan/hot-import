import * as assert from 'assert'
import * as fs     from 'fs'
import * as path   from 'path'

import { hotImport } from 'hot-import'

async function main() {
  const MODULE_CODE_42 = 'module.exports = () => 42'
  const MODULE_CODE_17 = 'module.exports.default = () => 17'

  const MODULE_FILE = path.join(__dirname, 't.js')

  try {
    fs.writeFileSync(MODULE_FILE, MODULE_CODE_42)
    const hotMod = await hotImport(MODULE_FILE)
    const hotModDup = await hotImport(MODULE_FILE)

    const fourtyTwo = hotMod()
    console.log(fourtyTwo)  // Output: fourtyTwo = 42
    assert(fourtyTwo === 42, 'first get 42')
    assert(hotModDup() === 42, 'first get 42')

    await new Promise(resolve => fs.writeFile(MODULE_FILE, MODULE_CODE_17, () => resolve()))

    const sevenTeen = hotMod()
    console.log(sevenTeen)  // Output sevenTeen = 17
    assert(sevenTeen === 17, 'get 17 after file update & hot reloaded')

  } catch (e) {
    console.error(e)
    return 1
  } finally {
    await hotImport(MODULE_FILE, false) // stop hot watch
  }
  return 0
}

main()
.then(process.exit)
.catch(e => {
  console.error(e)
  process.exit(1)
})
