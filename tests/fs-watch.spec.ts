#!/usr/bin/env ts-node
import * as fs    from 'fs'
import * as path  from 'path'

// tslint:disable:no-shadowed-variable
import * as test  from 'blue-tape'

import { log } from 'brolog'
// log.level('silly')

import {
  changingVariableModuleFixtures,
  tmpDir,
}                                   from './fixtures'

const FILENAME = 'test.data'

async function write(file: string, data: string | number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    log.verbose('TestFsWatch', 'write(%s) ...', file)
    fs.writeFile(file, data, err => {
      if (err) {
        return reject(err)
      }
      log.verbose('TestFsWatch', 'write(%s) done', file)
      return resolve()
    })
  })
}

function watch(
  file: string,
  cbRename: Function,
  cbChange: Function,
): fs.FSWatcher {
  const watcher = fs.watch(file, event => {
    log.verbose('TestFsWatch', 'watch(%s) fs.watch() event: %s', file, event)
    if (event === 'change') {
      let size
      try {
        size = fs.statSync(file).size
      } catch (e) {
        log.verbose('TestFsWatch', 'watch(%s) fs.watch() fs.statSync() exception: %s', e)
        return
      }
      if (!size) {
        return
      }
      cbChange()
    } else if (event === 'rename') {
      cbRename()
    }
  })
  return watcher
}

test('1/4. fs.writeFileSync then fs.writeFile', async t => {
  let watcher
  let changeCounter = 0
  let renameCounter = 0
  for (const workDir of tmpDir()) {
    const file = path.join(workDir, FILENAME)

    // init the file
    fs.writeFileSync(file, Math.random())
    await new Promise(setImmediate)

    watcher = watch(file, () => renameCounter++, () => changeCounter++)

    // change the file
    await write(file, Math.random())

  }
  await new Promise(setImmediate)

  t.equal(changeCounter, 1, 'should monitored file change event once')
  t.ok(watcher, 'should instanciated a watcher')
  if (watcher) {
    watcher.close()
  }
})

test('2/4. fs.writeFileSync then fs.writeFileSync', async t => {
  let watcher

  let renameCounter = 0
  let changeCounter = 0
  for (const workDir of tmpDir()) {
    const file = path.join(workDir, FILENAME)

    // init the file
    fs.writeFileSync(file, Math.random())
    await new Promise(setImmediate)

    watcher = watch(file, () => renameCounter++, () => changeCounter++)

    // change the file
    fs.writeFileSync(file, Math.random())
  }
  await new Promise(resolve => setTimeout(resolve, 10))

  t.equal(changeCounter, 0, 'should monitored 0 change event')
  t.equal(renameCounter, 1, 'should monitored 1 rename event')
  t.ok(watcher, 'should instanciated a watcher')
  if (watcher) {
    watcher.close()
  }
})

test('3/4. fs.writeFile then fs.writeFile', async t => {
  let watcher

  let renameCounter = 0
  let changeCounter = 0
  for (const workDir of tmpDir()) {
    const file = path.join(workDir, FILENAME)

    // init the file
    await write(file, Math.random())
    await new Promise(setImmediate)

    watcher = watch(file, () => renameCounter++, () => changeCounter++)

    // change the file
    await write(file, Math.random())
    await new Promise(setImmediate)
  }
  await new Promise(setImmediate)

  t.equal(changeCounter, 1, 'should monitored 1 change event')
  t.equal(renameCounter, 0, 'should monitored 0 rename event')
  t.ok(watcher, 'should instanciated a watcher')
  if (watcher) {
    watcher.close()
  }
})

test('4/4. fs.writeFile then fs.writeFileSync', async t => {
  let watcher

  let renameCounter = 0
  let changeCounter = 0
  for (const workDir of tmpDir()) {
    const file = path.join(workDir, FILENAME)

    // init the file
    await write(file, Math.random())
    await new Promise(setImmediate)

    watcher = watch(file, () => renameCounter++, () => changeCounter++)

    // change the file
    fs.writeFileSync(file, Math.random())
  }
  await new Promise(resolve => setTimeout(resolve, 10))

  t.equal(changeCounter, 0, 'should not monitored file change event')
  t.equal(renameCounter, 1, 'should monitored file rename event')
  t.ok(watcher, 'should instanciated a watcher')
  if (watcher) {
    watcher.close()
  }
})

test('fixtures', async t => {
  let file
  let watcher

  let renameCounter = 0
  let changeCounter = 0
  for await (const info of changingVariableModuleFixtures()) {
    if (!file) {
      file = info.file
      watcher = watch(file, () => renameCounter++, () => changeCounter++)
    } else {
      break // break on the 2nd loop
    }
  }
  await new Promise(setImmediate)

  t.equal(changeCounter, 1, 'should monitored file change event')
  t.equal(renameCounter, 0, 'should not monitored file rename event')
  t.ok(watcher, 'should instanciated a watcher')
  if (watcher) {
    watcher.close()
  }
})
