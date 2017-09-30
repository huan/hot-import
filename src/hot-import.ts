import * as fs      from 'fs'
import * as path    from 'path'

// const callerPath      = require('caller-path')
const callsites       = require('callsites')

import { log }        from 'brolog'

export interface KVStore {
  [id: string]: any
}

export const moduleStore  = {} as KVStore
export const proxyStore   = {} as KVStore
export const watcherStore = {} as KVStore

export async function refreshImport(absFilePath: string): Promise<void> {
  log.verbose('HotImport', 'refreshImport(%s)', absFilePath)
  const oldCache = purgeRequireCache(absFilePath)
  try {
    const refreshedModule     = await importFile(absFilePath)
    moduleStore[absFilePath]  = refreshedModule

    cloneProperties(
      proxyStore[absFilePath],
      moduleStore[absFilePath],
    )

    log.verbose('HotImport', 'refreshImport(%s) Hot Module Re-Imported', absFilePath)
  } catch (e) {
    log.error('HotImport', 'refreshImport(%s) exception: %s', absFilePath, e)
    restoreRequireCache(absFilePath, oldCache)
    log.info('HotImport', 'refreshImport(%s) keep using the latest usable version', absFilePath)
  }
}

export async function hotImport(filePathRelativeToCaller: string)               : Promise<any>
export async function hotImport(filePathRelativeToCaller: string, watch: false) : Promise<void>

export async function hotImport(filePathRelativeToCaller: string, watch = true): Promise<any> {
  log.verbose('HotImport', 'hotImport(%s, %s)', filePathRelativeToCaller, watch)

  if (!watch) {
    makeCold(filePathRelativeToCaller)
    return
  }

  // convert './module' to '${cwd}/module.js'
  const absFilePath = require.resolve(
    callerResolve(filePathRelativeToCaller),
  )

  if (!(absFilePath in moduleStore)) {
    log.verbose('HotImport', 'hotImport() init moduleStore[%s]...', absFilePath)
    const newModule = await importFile(absFilePath)
    moduleStore[absFilePath] = newModule
    proxyStore[absFilePath]  = initProxyModule(absFilePath)
    cloneProperties(proxyStore[absFilePath], moduleStore[absFilePath])

    makeHot(absFilePath)
  }

  return proxyStore[absFilePath]
}

export function makeHot(filePath: string): void {
  const absFilePath = require.resolve(
    callerResolve(filePath),
  )
  log.verbose('HotImport', 'makeHot(%s)', absFilePath)

  if (watcherStore[absFilePath]) {
    throw new Error(`makeHot(${absFilePath}) it's already hot!`)
  }
  const watcher = fs.watch(absFilePath, event => {
    if (event !== 'change') {
      return
    }
    let size = 0
    try {
      size = fs.statSync(absFilePath).size
    } catch (e) {
      log.warn('HotImport', 'hotImport() fs.statSync(%s) exception: %s',
                            absFilePath, e)
    }
    if (size === 0) {
      log.warn('HotImport', 'hotImport() fs.statSync(%s) size:0', absFilePath)
      return
    }
    log.verbose('HotImport', 'hotImport() fs.watch(%s, %s)', absFilePath, event)
    refreshImport(absFilePath)
  })
  watcherStore[absFilePath] = watcher
}

export function makeCold(filePath: string): void {
  const absFilePath = require.resolve(
    callerResolve(filePath),
  )
  log.verbose('HotImport', 'makeCold(%s)', absFilePath)

  const watcher = watcherStore[absFilePath]
  if (watcher) {
    watcher.close()
    delete watcherStore[absFilePath]
  } else {
    log.verbose('HotImport', 'makeCold(%s) already cold.', absFilePath)
  }
}

export function makeColdAll(): void {
  for (const file in watcherStore) {
    const watcher = watcherStore[file]
    if (watcher) {
      watcher.close()
      delete watcherStore[file]
    }
  }
}

export function cloneProperties(dst: any, src: any) {
  log.verbose('HotImport', 'cloneProperties()')

  for (const prop in src) {
    log.silly('HotImport', 'cloneProperties() cloning %s', prop)
    dst[prop] = src[prop]
  }
  if (src.prototype) {
    log.silly('HotImport', 'cloneProperties() cloning prototype')
    dst.prototype = src.prototype
  }
}

// resolve filename based on caller's __dirname
export function callerResolve(filePath: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath
  }

  let callerFile: string | undefined
  for (const callsite of callsites()) {
    const file = callsite.getFileName()
    const type = callsite.getTypeName()

    if (file && type) {
      if (file === __filename) {
        continue
      }
      callerFile = file
      break
    }
  }

  if (!callerFile) {
    throw new Error('not found caller file?')
  }
  const callerDir  = path.dirname(callerFile)

  const absFilename = path.resolve(
    callerDir,
    filePath,
  )
  return absFilename
}

// create an object instance (via the new operator),
// but pass an arbitrary number of arguments to the constructor.
// https://stackoverflow.com/a/8843181/1123955
export function newCall(cls: any, ..._: any[]) {
  const instance = new (Function.prototype.bind.apply(cls, arguments))
  return instance
}

export function initProxyModule(absFilePath: string): any {
  log.verbose('HotImport', 'initProxyModule(%s)', absFilePath)

  if (!(absFilePath in moduleStore)) {
    throw new Error(`moduleStore has no ${absFilePath}!`)
  }

  const proxyModule = function (this: any, ...args: any[]): any {
    if (this) { // for `new HotImport()`
      return newCall(moduleStore[absFilePath], ...args)
    } else {    // for just `hotImport()`
      if (typeof moduleStore[absFilePath] !== 'function') {
        throw new TypeError('is not a function')
      }
      return moduleStore[absFilePath].apply(moduleStore[absFilePath], args)
    }
  }
  return proxyModule
}

export async function importFile(absFilePath: string): Promise<any> {
  log.verbose('HotImport', 'importFile(%s)', absFilePath)

  if (!path.isAbsolute(absFilePath)) {
    throw new Error('must be absolute path!')
  }

  try {
    return await import(absFilePath)
  } catch (e) {
    log.error('HotImport', 'importFile(%s) rejected: %s', absFilePath, e)
  }
}

export function purgeRequireCache(absFilePath: string): any {
  log.verbose('HotImport', 'purgeRequireCache(%s)', absFilePath)
  const mod = require.resolve(absFilePath)
  const oldCache = require.cache[mod]
  if (!oldCache) {
    throw new Error(`oldCache not found for mod:${mod}`)
  }
  delete require.cache[mod]
  return oldCache
}

export function restoreRequireCache(absFilePath: string, cache: any): void {
  log.verbose('HotImport', 'restoreRequireCache(%s, cache)', absFilePath)
  const mod = require.resolve(absFilePath)
  require.cache[mod] = cache
}

export default hotImport
