import * as fs    from 'fs'
import * as os    from 'os'
import * as path  from 'path'

import * as rimraf  from 'rimraf'

export interface ModuleInfo {
  file        : string,
  returnValue : any,
}

// Actually the `export = 42` is not supported by hot-import currently.
// This fixture is only for test purpose.
export function* changingVariableModuleFixtures(): IterableIterator<ModuleInfo> {
  for (const workDir of tmpDir()) {
    const MODULE_FILE = path.join(
      workDir,
      'changing-module.ts',
    )
    const EXPECTED_ORIGINAL_TEXT = 'original'
    const EXPECTED_CHANGED_TEXT  = 'changed'

    try {
      fs.writeFileSync(MODULE_FILE, `export const answer = '${EXPECTED_ORIGINAL_TEXT}'`)

      yield {
        file        : MODULE_FILE,
        returnValue : EXPECTED_ORIGINAL_TEXT,
      }

      fs.writeFileSync(MODULE_FILE, `export const answer = '${EXPECTED_CHANGED_TEXT}'`)

      yield {
        file        : MODULE_FILE,
        returnValue : EXPECTED_CHANGED_TEXT,
      }

    } catch (e) {
      console.error(e)
    }
  }
}

export function* emptyObjectModuleFixture(): IterableIterator<ModuleInfo> {
  for (const workDir of tmpDir()) {
    const moduleFile = path.join(
      workDir,
      'empty-module.ts',
    )
    const expectedValue = {}

    try {
      fs.writeFileSync(moduleFile, `export = {}`)

      yield {
        file        : moduleFile,
        returnValue : expectedValue,
      }

    } catch (e) {
      console.error(e)
    }
  }
}

export function* changingClassModuleFixtures(): IterableIterator<ModuleInfo> {
  for (const workDir of tmpDir()) {
    const moduleFile = path.join(
      workDir,
      'class-module.ts',
    )
    const moduleCode1 = `export = class Test1 { public id = 1; constructor(public text: string) {}; }`
    const moduleCode2 = `export = class Test2 { public id = 2; constructor(public text: string) {}; }`

    try {
      fs.writeFileSync(moduleFile, moduleCode1)

      yield {
        file        : moduleFile,
        returnValue : 1,
      }

      fs.writeFileSync(moduleFile, moduleCode2)

      yield {
        file        : moduleFile,
        returnValue : 2,
      }

    } catch (e) {
      console.error(e)
    }
  }
}

function* tmpDir(): IterableIterator<string> {
  const dir = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      'hot-import-',
    ),
  )

  try {
    yield dir
  } finally {
    rimraf(dir, e => {
      if (e) {
        console.error('rimraf error: ', e)
      }
    })
  }
}
