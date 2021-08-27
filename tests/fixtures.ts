import * as fs    from 'fs'
import * as os    from 'os'
import * as path  from 'path'

import * as rimraf  from 'rimraf'

export interface ModuleInfo {
  file        : string,
  returnValue : any,
}

export function * emptyObjectModuleFixture (): IterableIterator<ModuleInfo> {
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

export async function* changingVariableModuleFixtures(): AsyncIterableIterator<ModuleInfo> {
  for (const workDir of tmpDir()) {
    const MODULE_FILE = path.join(
      workDir,
      'changing-module.ts',
    )
    const ORIGINAL_TEXT = 'original'
    const CHANGED_TEXT  = 'changed'

    try {
      fs.writeFileSync(MODULE_FILE, `export const answer = '${ORIGINAL_TEXT}'`)

      yield {
        file        : MODULE_FILE,
        returnValue : ORIGINAL_TEXT,
      }

      await new Promise(resolve => {
        fs.writeFile(
          MODULE_FILE,
          `export const answer = '${CHANGED_TEXT}'`,
          resolve,
        )
      })

      yield {
        file        : MODULE_FILE,
        returnValue : CHANGED_TEXT,
      }

    } catch (e) {
      console.error(e)
    }
  }
}

export async function* changingClassModuleFixtures(): AsyncIterableIterator<ModuleInfo> {
  for (const workDir of tmpDir()) {
    const moduleFile = path.join(
      workDir,
      'class-module.ts',
    )
    const MODULE_CODE1 = `export = class Test1 { public id = 1; constructor(public text: string) {}; }`
    const MODULE_CODE2 = `export = class Test2 { public id = 2; constructor(public text: string) {}; }`

    try {
      fs.writeFileSync(moduleFile, MODULE_CODE1)

      yield {
        file        : moduleFile,
        returnValue : 1,
      }

      await new Promise(resolve => fs.writeFile(moduleFile, MODULE_CODE2, resolve))

      yield {
        file        : moduleFile,
        returnValue : 2,
      }

    } catch (e) {
      console.error(e)
    }
  }
}

export async function* changingRawFuncModuleFixtures(): AsyncIterableIterator<ModuleInfo> {
  for (const workDir of tmpDir()) {
    const MODULE_FILE = path.join(
      workDir,
      'changing-module.ts',
    )
    const ORIGINAL_TEXT = 'original'
    const CHANGED_TEXT  = 'changed'

    try {
      fs.writeFileSync(MODULE_FILE, `export = () => '${ORIGINAL_TEXT}'`)

      yield {
        file        : MODULE_FILE,
        returnValue : ORIGINAL_TEXT,
      }

      await new Promise(resolve => {
        fs.writeFile(
          MODULE_FILE,
          `export = () => '${CHANGED_TEXT}'`,
          resolve,
        )
      })

      yield {
        file        : MODULE_FILE,
        returnValue : CHANGED_TEXT,
      }

    } catch (e) {
      console.error(e)
    }
  }
}

export function* tmpDir(): IterableIterator<string> {
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
