import * as path  from 'path'

// tslint:disable:no-shadowed-variable
import * as test  from 'blue-tape'

import {
  changingVariableModuleFixtures,
  changingClassModuleFixtures,
  emptyObjectModuleFixture,
}                           from '../tests/fixtures'

import {
  callerResolve,
  cloneProperties,
  debugSetModule,
  fsWatcher,
  hotImport,
  importFile,
  moduleProxy,
  newCall,
  purgeRequireCache,
}                           from './hot-import'

import { log }      from 'brolog'
log.level('silly')

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
})

test('newCall()', async t => {
  class TextClass {
    constructor(public text: string) {}
  }
  const textClass = newCall(TextClass, EXPECTED_TEXT)
  t.equal(textClass.text, EXPECTED_TEXT, 'should instanciate class with constructor arguments')
})

// XXX
test('hotImport()', async t => {
  t.test('class module', async t => {
    let file, cls
    for (const info of changingClassModuleFixtures()) {
      // wait io finish/chokidar event to be fired
      await new Promise(resolve => setImmediate(resolve))
      await new Promise(resolve => setTimeout(resolve, 500))

      console.log('info', info)
      if (!cls) {
        file = info.file
        cls = await hotImport(file)
      }
      t.equal(file, info.file, 'should get same module file for fixtures(change file content only)')

      const result = new cls(EXPECTED_TEXT)
      console.log('result', result)
      t.equal(result.text, EXPECTED_TEXT, 'should get expected values from instance of class in module')
      t.equal(result.id, info.returnValue, 'should import module class with right id')
    }
  })

  // for (const info of changingModuleFixtures()) {
  // t.test('class constructor', async t => {
  //   for (const info of classModuleFixture()) {
  //     const m = await hotImport(info.file)
  //     const i = new m(EXPECTED_TEXT)
  //     t.equal(i.text, EXPECTED_TEXT, 'should import class & instanciated right')
  //   }
  // })

  fsWatcher.close()
})

test('importFile()', async t => {
  t.test('const value', async t => {
    for (const info of changingVariableModuleFixtures()) {
      // console.log('info', info)
      // const file = info.file.replace(/\.ts$/i, '')
      purgeRequireCache(info.file)
      const m = await importFile(info.file)
      t.equal(m, info.returnValue, 'should import file right with returned value ' + info.returnValue)
    }
  })
  t.test('class', async t => {
    for (const info of changingClassModuleFixtures()) {
      const m = await importFile(info.file)
      const result = new m(EXPECTED_TEXT)
      t.equal(result.text, EXPECTED_TEXT, 'should instanciated class with constructor argument')
      t.equal(result.id, info.returnValue, 'should import module class with right id')
    }
  })
})

test('moduleProxy()', async t => {
  const TEST_CLASS = class {
    constructor(public text: string) {}
  }

  debugSetModule(undefined)
  t.throws(() => moduleProxy(), 'should throw without initialized theModule')
  t.throws(() => new (moduleProxy as any)(), 'should throw without initialized theModule')

  debugSetModule(TEST_CLASS)
  const m = new (moduleProxy as any)(EXPECTED_TEXT)
  t.equal(m.text, EXPECTED_TEXT, 'should instiaciated class with constructor parameter')
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

test('fsWatcher on change', async t => {
  let iteratorCounter = 0
  let changeCounter   = 0

  for (const info of changingVariableModuleFixtures()) {
    if (iteratorCounter === 0) {
      fsWatcher.on('change', filePath => {
        if (filePath === info.file) {
          changeCounter++
        }
      })
      fsWatcher.add(info.file)
    }
    iteratorCounter++
    // wait io finish/chokidar event to be fired
    await new Promise(resolve => setImmediate(resolve))
  }
  console.log('iteratorCounter', iteratorCounter)
  console.log('changeCounter', changeCounter)

  // wait io finish/chokidar event to be fired
  await new Promise(resolve => setImmediate(resolve))

  t.ok(iteratorCounter > 1, 'should loop for at least 2 times')
  t.equal(changeCounter, iteratorCounter - 1, 'should change (iteratorCount - 1) times')
  fsWatcher.close()
})

test('cloneProperties()', async t => {
  const SRC = { text: EXPECTED_TEXT }
  const SRC_CLASS = class { constructor(public text: string) {} }

  t.test('object', async t => {
    const dst = {} as any
    cloneProperties(SRC, dst)
    t.equal(dst.text, EXPECTED_TEXT, 'should clone the text property')
  })

  t.test('class', async t => {
    const dst = {} as any
    cloneProperties(SRC_CLASS, dst)
    t.equal(SRC_CLASS.prototype, dst.prototype, 'should clone the prototype for class')
  })
})
