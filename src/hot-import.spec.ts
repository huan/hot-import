#!/usr/bin/env ts-node
import * as path  from 'path'

// tslint:disable:no-shadowed-variable
import * as test  from 'blue-tape'

import {
  changingClassModuleFixtures,
  changingRawFuncModuleFixtures,
  changingVariableModuleFixtures,
  emptyObjectModuleFixture,
}                           from '../tests/fixtures'

import {
  callerResolve,
  cloneProperties,
  hotImport,
  importFile,
  initProxyModule,
  // makeHot,
  // makeCold,
  // makeColdAll,
  moduleStore,
  newCall,
  proxyStore,
  purgeRequireCache,
  refreshImport,
  // restoreRequireCache,
  VERSION,
}                           from './hot-import'

// import { log }      from 'brolog'
// log.level('silly')

const EXPECTED_TEXT = 'testing123'

test('callerResolve()', async t => {
  const RELATIVE_FILE_PATH = './test'
  const ABSOLUTE_FILE_PATH = path.resolve(
    __dirname,
    RELATIVE_FILE_PATH,
  )
  t.test('relative file path', async t => {
    const filePath = callerResolve(RELATIVE_FILE_PATH)
    t.equal(filePath, ABSOLUTE_FILE_PATH, 'should turn relative to absolute')
  })
  t.test('absolute file path', async t => {
    const filePath = callerResolve(ABSOLUTE_FILE_PATH)
    t.equal(filePath, ABSOLUTE_FILE_PATH, 'should keep absolute as it is')
  })
  t.test('callerExceptFile', async t => {
    const filePath = callerResolve(RELATIVE_FILE_PATH, __filename)
    // console.log(filePath)
    t.assert(filePath.endsWith(path.join( // cross platform: compatible with windows
      'node_modules',
      'tape',
      'lib',
      'test',
    )), 'except the current file name')
  })
})

test('newCall()', async t => {
  class TextClass {
    constructor (public text: string) {}
  }
  const textClass = newCall(TextClass, EXPECTED_TEXT)
  t.equal(textClass.text, EXPECTED_TEXT, 'should instanciate class with constructor arguments')
})

test('hotImport()', async t => {
  t.test('class module(export=)', async t => {
    let file, Cls
    for await (const info of changingClassModuleFixtures()) {
      /**
       * io event loop wait for fs.watch
       * FIXME: Find out the reason...
       */
      await new Promise(setImmediate) // the first one is enough for Linux(Ubuntu 17.04)
      await new Promise(setImmediate) // the second one is needed for Windows 7

      if (!Cls) {
        file = info.file
        Cls = await hotImport(file)
      } else {
        t.equal(file, info.file, 'should get same module file for fixtures(change file content only)')
      }

      await new Promise(resolve => setTimeout(resolve, 10))
      const result = new Cls(EXPECTED_TEXT)
      t.equal(result.text, EXPECTED_TEXT, 'should get expected values from instance of class in module')
      t.equal(result.id, info.returnValue, 'should import module class with right id:' + info.returnValue)
    }
    if (file) {
      await hotImport(file, false)
    }
  })

  t.test('variable module(export const answer=)', async t => {
    let file, hotMod
    for await (const info of changingVariableModuleFixtures()) {
      /**
       * io event loop wait for fs.watch
       * FIXME: Find out the reason...
       */
      await new Promise(setImmediate) // the first one is enough for Linux(Ubuntu 17.04) with Node.js v8
      await new Promise(setImmediate) // the second one is needed for Windows 7

      if (!hotMod) {
        file = info.file
        hotMod = await hotImport(file)
      } else {
        t.equal(file, info.file, 'should get same module file for fixtures(change file content only)')
      }

      await new Promise(resolve => setTimeout(resolve, 10))
      t.equal(hotMod.answer, info.returnValue, 'should get expected values from variable in module')
    }
    if (file) {
      await hotImport(file, false)
    }
  })

  t.test('raw export module(export = () => "value")', async t => {
    let file, hotMod
    for await (const info of changingRawFuncModuleFixtures()) {
      /**
       * io event loop wait for fs.watch
       * FIXME: Find out the reason...
       */
      await new Promise(setImmediate) // the first one is enough for Linux(Ubuntu 17.04) with Node.js v8
      await new Promise(setImmediate) // the second one is needed for Windows 7

      if (!hotMod) {
        file = info.file
        hotMod = await hotImport(file)
      } else {
        t.equal(file, info.file, 'should get same module file for fixtures(change file content only)')
      }

      await new Promise(resolve => setTimeout(resolve, 10))
      t.equal(hotMod(), info.returnValue, 'should get expected values from the return value of raw func in module')
    }
    if (file) {
      await hotImport(file, false)
    }
  })

  t.test('module that only has a default export', async t => {
    const EXPECTED_RETURN_VALUE = 42
    const DEFAULT_EXPORT_ONLY_MODULE_FILE = '../tests/fixtures/default-export-module'
    const mod = await hotImport(DEFAULT_EXPORT_ONLY_MODULE_FILE)
    t.equal(mod(), EXPECTED_RETURN_VALUE, 'should get the default export function return value right')
    await hotImport(DEFAULT_EXPORT_ONLY_MODULE_FILE, false).catch(() => t.fail('rejected'))
  })

})

test('importFile()', async t => {
  t.test('const value', async t => {
    for await (const info of changingVariableModuleFixtures()) {
      const hotMod = await importFile(info.file)
      t.equal(hotMod.answer, info.returnValue, 'should import file right with returned value ' + info.returnValue)
      break // only test once for importFile
    }
  })
  t.test('class', async t => {
    for await (const info of changingClassModuleFixtures()) {
      const Module = await importFile(info.file)
      const result = new Module(EXPECTED_TEXT)
      t.equal(result.text, EXPECTED_TEXT, 'should instanciated class with constructor argument')
      t.equal(result.id, info.returnValue, 'should import module class with right id')
      break // only test once for importFile
    }
  })
})

test('refreshImport()', async t => {
  let cls
  for await (const info of changingClassModuleFixtures()) {
    if (!cls) {
      cls = await importFile(info.file)

      moduleStore[info.file] = cls
      proxyStore[info.file]  = initProxyModule(info.file)
    } else {
      await refreshImport(info.file)
      t.notEqual(moduleStore[info.file], cls, 'should be refreshed to new value')
    }
  }
})

test('purgeRequireCache()', async t => {
  const KEY = 'test-key'
  const VAL = 'test-val'
  for (const info of emptyObjectModuleFixture()) {
    const m0 = await importFile(info.file)
    t.deepEqual(m0, info.returnValue, 'should get returnValue from module')

    m0[KEY] = VAL
    const m1 = await importFile(info.file)
    t.equal(m1[KEY], VAL, 'should keep value in require cache')

    purgeRequireCache(info.file)
    const m2 = await importFile(info.file)
    t.deepEqual(m2, info.returnValue, 'should get returnValue again after purge')
    t.equal(m2[KEY], undefined, 'should no KEY exists any more')
  }
})

test('cloneProperties()', async t => {
  const SRC = { text: EXPECTED_TEXT }
  /* eslint padded-blocks: off */
  const SRC_CLASS = class { constructor (public text: string) {} }

  t.test('object', async t => {
    const dst = {} as any
    cloneProperties(dst, SRC)
    t.equal(dst.text, EXPECTED_TEXT, 'should clone the text property')
  })

  t.test('class', async t => {
    const dst = {} as any
    cloneProperties(dst, SRC_CLASS)
    t.equal(SRC_CLASS.prototype, dst.prototype, 'should clone the prototype for class')
  })
})

test('VERSION', async t => {
  t.ok(VERSION.match(/^\d+\.\d+\.\d+$/), 'should get semver version')
  t.equal(VERSION, '0.0.0', 'should be 0.0.0 in source code')
})
