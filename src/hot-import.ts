// See:
// https://github.com/rayosu/hot-require/blob/master/hot-require.js
// http://blog.chatie.io/developer/2017/03/20/added-hot-reload-for-bots.html
import * as path    from 'path'

const callerPath      = require('caller-path')
import { FSWatcher }  from 'chokidar'

import { log }        from 'brolog'

export interface ModuleStore {
  [id: string]: any
}

export const moduleStore: ModuleStore = {}
export const proxyStore : ModuleStore = {}

export const fsWatcher = initFileWatcher(refreshImport)

function initFileWatcher(changeListener: (absFilePath: string) => void): FSWatcher {
  const watcher = new FSWatcher()
  .on('add', filePath => {
    log.verbose('HotImport', `initFileWatcher() watcher.on(add) File ${filePath} has been added`)
  })
  .on('error', (error, filePath) => {
    log.error('HotImport', 'initFileWatcher() watcher.on(error) %s',
                            filePath, error)
    log.error('HotImport', 'initFileWatcher() watcher.on(error) watcher.unwatch(%s)', filePath)
    watcher.unwatch(filePath)
  })

  watcher.on('change', changeListener)
  return watcher
}

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

export async function hotImport(filePathRelativeToCaller: string): Promise<any> {
  log.verbose('HotImport', 'hotImport(%s)', filePathRelativeToCaller)

  const absFilePath = callerResolve(filePathRelativeToCaller)

  if (!(absFilePath in moduleStore)) {
    log.verbose('HotImport', 'hotImport(%s) init theModule...', absFilePath)
    const newModule = await importFile(absFilePath)
    moduleStore[absFilePath] = newModule
    proxyStore[absFilePath]  = initProxyModule(absFilePath)
    cloneProperties(proxyStore[absFilePath], moduleStore[absFilePath])
    fsWatcher.add(absFilePath)

    // fsWatcher.on(ready) must be called after .add(path)
    await new Promise(resolve => fsWatcher.once('ready', resolve))

    console.log('Watched', fsWatcher.getWatched())
  }

  return proxyStore[absFilePath]
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
export function callerResolve(id: string): string {
  if (path.isAbsolute(id)) {
    return id
  }

  const callerFile = callerPath()
  const callerDir  = path.dirname(callerFile)

  const absFilename = path.resolve(
    callerDir,
    id,
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
