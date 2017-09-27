const { makeColdAll } = require('hot-import')

async function main() {
  try {
    makeColdAll()
  } catch (e) {
    console.error(e)
    return 1
  } finally {
    makeColdAll()
  }
  return 0
}

main()
.then(process.exit)
.catch(e => {
  console.error(e)
  process.exit(1)
})
