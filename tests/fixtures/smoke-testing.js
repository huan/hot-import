const assert = require('assert')
const fs     = require('fs')
const path   = require('path')

const { hotImport } = require('hot-import')

async function main() {
  const MODULE_CODE_42 = 'exports.answer = () => 42'
  const MODULE_CODE_17 = 'exports.answer = () => 17'

  const MODULE_FILE = path.join(__dirname, 't.js')

  try {
    fs.writeFileSync(MODULE_FILE, MODULE_CODE_42)
    const mod = await hotImport(MODULE_FILE)

    const fourtyTwo = mod.answer()
    console.log(fourtyTwo)  // Output: fourtyTwo = 42
    assert(fourtyTwo === 42, 'first get 42')

    fs.writeFileSync(MODULE_FILE, MODULE_CODE_17)
    await new Promise(setImmediate) // wait io event loop finish

    const sevenTeen = mod.answer()
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
