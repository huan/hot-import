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

async function watch(
  file     : string,
  cbChange : (...args: any[]) => void,
  cbRename : (...args: any[]) => void,
): Promise<fs.FSWatcher> {
  const watcher = fs.watch(file)
  .on('error', e => {
    log.verbose('TestFsWatch', 'watch(%s) watcher.on(error): %s', file, e)
  })
  .on('change', onChange)
  .on('rename', cbRename)

  // wait all io event loop to be cleared before return watcher
  await new Promise(setImmediate)
  return watcher

  function onChange(eventType: 'rename' | 'change') {
    let size
    try {
      // the first change event is create a size 0 file
      // however, when we stat the file, the file might already be writen some data.
      // so we also might get a size>0 at here.
      size = fs.statSync(file).size
      log.verbose('TestFsWatch', 'watch(%s) onChange(%s) size: %s',
                                  file, eventType, size)
    } catch (e) {
      log.verbose('TestFsWatch', 'watch(%s) onChange(%s) fs.statSync() exception: %s',
                                  file, eventType, e)
      return
    }
    if (eventType !== 'change' || !size) {
      return
    }
    cbChange()
  }
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

    watcher = await watch(
      file,
      () => changeCounter++,
      () => renameCounter++,
    )

    // change the file
    await write(file, Math.random())

  }
  await new Promise(r => setTimeout(r, 100))

  t.ok(changeCounter >= 1, 'should monitored file change event at least once')
  // t.ok(changeCounter <= 2, 'should monitored file change event at most twice')
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

    watcher = await watch(
      file,
      () => changeCounter++,
      () => renameCounter++,
    )

    // change the file
    fs.writeFileSync(file, Math.random())
  }
  await new Promise(resolve => setTimeout(resolve, 100))

  // change event is not consistant through Windows & Linux: Windows fire twice, Linux fire once.
  // t.equal(changeCounter, 1, 'should monitored 1 change event')

  //  rename event is not consistant through Mac & Linux: Mac fire once, Linux fire twice.
  // t.equal(renameCounter, 1, 'should monitored 1 rename event')

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

    watcher = await watch(
      file,
      () => changeCounter++,
      () => renameCounter++,
    )

    // change the file
    await write(file, Math.random())
    await new Promise(setImmediate)
  }
  await new Promise(resolve => setTimeout(resolve, 100))

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

    watcher = await watch(
      file,
      () => changeCounter++,
      () => renameCounter++,
    )

    // change the file
    fs.writeFileSync(file, Math.random())
  }
  await new Promise(resolve => setTimeout(resolve, 100))

  // change event is not consistant through Windows & Linux: Windows fire twice, Linux fire once.
  // t.equal(changeCounter, 1, 'should monitored 1 file change event')

  // rename event is not consistant through Mac & Linux: Mac fire once, Linux fire twice.
  // t.equal(renameCounter, 1, 'should monitored 1 file rename event')

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
      watcher = await watch(
        file,
        () => changeCounter++,
        () => renameCounter++,
      )
    } else {
      break // break on the 2nd loop
    }
  }
  await new Promise(r => setTimeout(r, 100))

  t.ok(changeCounter >= 1, 'should monitored file change event at least once')
  // t.ok(changeCounter <= 2, 'should monitored file change event at most twice')
  t.equal(renameCounter, 0, 'should not monitored file rename event')
  t.ok(watcher, 'should instanciated a watcher')
  if (watcher) {
    watcher.close()
  }
})
