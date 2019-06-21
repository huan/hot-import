/* eslint no-whitespace-before-property: off */
/* eslint import/export: off */
/* eslint no-useless-return: off */

import * as fs      from 'fs'
import * as path    from 'path'

import { log }        from 'brolog'
import callsites      from 'callsites'

export { VERSION } from './version'

export interface KVStore {
  [id: string]: any
}

export const moduleStore  = {} as KVStore
export const proxyStore   = {} as KVStore
export const watcherStore = {} as KVStore

export async function refreshImport (absFilePath: string): Promise<void> {
  log.silly('HotImport', 'refreshImport(%s)', absFilePath)
  const oldCache = purgeRequireCache(absFilePath)
  try {
    const refreshedModule     = await importFile(absFilePath)
    moduleStore[absFilePath]  = refreshedModule

    cloneProperties(
      proxyStore[absFilePath],
      moduleStore[absFilePath],
    )

    log.verbose('HotImport', 'refreshImport(%s) Hot Module Replacement (HMR): Re-Imported', absFilePath)
  } catch (e) {
    log.error('HotImport', 'refreshImport(%s) exception: %s', absFilePath, e)
    restoreRequireCache(absFilePath, oldCache)
    log.error('HotImport', 'refreshImport(%s) keep using the latest usable version', absFilePath)
  }
}

export async function hotImport (modulePathRelativeToCaller: string)                        : Promise<any>
export async function hotImport (modulePathRelativeToCaller: string | null, watch: boolean) : Promise<void>

export async function hotImport (modulePathRelativeToCaller: string | null, watch = true): Promise<any> {
  log.verbose('HotImport', 'hotImport(%s, %s)', modulePathRelativeToCaller, watch)

  if (!modulePathRelativeToCaller) {
    if (watch) {
      makeHotAll()
    } else {
      makeColdAll()
    }
    return
  }

  // convert './module' to '${cwd}/module.js'
  const absFilePath = require.resolve(
    callerResolve(modulePathRelativeToCaller),
  )

  if (!watch) {
    makeCold(absFilePath)
    return
  }

  if (absFilePath in moduleStore) {
    log.silly('HotImport', 'hotImport() moduleStore[%s] already exist.', absFilePath)
    return proxyStore[absFilePath]
  }

  const realModule = await importFile(absFilePath)

  moduleStore[absFilePath] = realModule
  proxyStore [absFilePath] = initProxyModule(absFilePath)

  cloneProperties(
    proxyStore[absFilePath],
    moduleStore[absFilePath],
  )

  makeHot(absFilePath)

  return proxyStore[absFilePath]
}

export function makeHot (absFilePath: string): void {
  log.silly('HotImport', 'makeHot(%s)', absFilePath)

  if (watcherStore[absFilePath]) {
    log.silly('HotImport', `makeHot(${absFilePath}) it's already hot, skip it`)
    return
  }

  const watcher = fs.watch(absFilePath)
  watcher.on('change', onChange)

  watcherStore[absFilePath] = watcher

  function onChange (eventType: 'rename' | 'change', filename: string) {
    log.silly('HotImport', 'makeHot(%s) onChange(%s, %s)', absFilePath, eventType, filename)
    if (eventType !== 'change') {
      return
    }

    let size = 0
    try {
      size = fs.statSync(absFilePath).size
    } catch (e) {
      log.silly('HotImport', 'makeHot() onChange() fs.statSync(%s) exception: %s',
        absFilePath, e)
    }
    // change event might fire multiple times, one for create(with zero size), others for write.
    if (size === 0) {
      log.silly('HotImport', 'makeHot() onChange() fs.statSync(%s) size:0', absFilePath)
      return
    }
    refreshImport(absFilePath).catch(e => log.error('HotImport', 'makeHot() refreshImport rejection: %s', e && e.message))
  }
}

export function makeCold (absFilePath: string) : void
export function makeCold (mod: any)            : void

export function makeCold (absFilePathOrMod: string | any): void {
  log.silly('HotImport', 'makeCold(%s)', absFilePathOrMod)

  let absFilePath: string
  if (typeof absFilePathOrMod === 'string') { // filePath
    absFilePath = absFilePathOrMod
  } else {                                    // module
    absFilePath = mod2file(absFilePathOrMod)
  }

  const watcher = watcherStore[absFilePath]
  if (watcher) {
    watcher.close()
    delete watcherStore[absFilePath]
  } else {
    log.silly('HotImport', 'makeCold(%s) already cold.', absFilePath)
  }

  return

  function mod2file (mod: any) {
    for (const file in proxyStore) {
      if (proxyStore[file] === mod) {
        return file
      }
    }
    throw new Error('makeClold() mod2file() can not found module in proxyStore')
  }
}

export function makeColdAll (): void {
  log.verbose('HotImport', 'makeColdAll()')

  for (const file in watcherStore) {
    makeCold(file)
  }
}

export function makeHotAll (): void {
  log.verbose('HotImport', 'makeHotAll()')

  for (const file in watcherStore) {
    makeHot(file)
  }
}

export function cloneProperties (dst: any, src: any) {
  log.silly('HotImport', 'cloneProperties()')

  for (const prop in dst) {
    log.silly('HotImport', 'cloneProperties() cleaning dst.%s', prop)
    delete dst[prop]
  }

  for (const prop in src) {
    log.silly('HotImport', 'cloneProperties() cloning %s', prop)
    dst[prop] = src[prop]
  }

  if (src.prototype) {
    log.silly('HotImport', 'cloneProperties() cloning prototype')
    dst.prototype = src.prototype
  }
}

/**
 * Resolve filename based on caller's __dirname
 */
export function callerResolve (filePath: string, callerFileExcept?: string): string {
  log.verbose('HotImport', 'callerResolve(%s, %s)', filePath, callerFileExcept)

  if (path.isAbsolute(filePath)) {
    return filePath
  }

  const fileSkipList = [__filename]
  if (callerFileExcept) {
    fileSkipList.push(callerFileExcept)
  }

  let callerFile: string | undefined
  for (const callsite of callsites()) {
    const file = callsite.getFileName()
    const type = callsite.getTypeName()
    log.silly('HotImport', 'callerResolve() callsites() file=%s, type=%s', file, type)

    /**
     * type sometimes is null?
     * callsites() file=/home/zixia/chatie/wechaty/node_modules/hot-import/dist/src/hot-import.js, type=Object
     * callsites() file=/home/zixia/chatie/wechaty/src/puppet/puppet.ts, type=PuppetPuppeteer
     * callsites() file=/home/zixia/chatie/wechaty/src/puppet-puppeteer/puppet-puppeteer.ts, type=null
     * callsites() file=/home/zixia/chatie/wechaty/src/wechaty.ts, type=Wechaty
     * callerFile=/home/zixia/chatie/wechaty/src/wechaty.ts
     */
    if (file /* && type */) {
      let skip = false
      fileSkipList.some(skipFile => !!(skip = (skipFile === file)))
      if (skip) {
        continue
      }
      callerFile = file
      break
    }
  }

  if (!callerFile) {
    throw new Error('not found caller file?')
  }
  log.silly('HotImport', 'callerResolve() callerFile=%s', callerFile)
  const callerDir  = path.dirname(callerFile)

  const absFilePath = path.resolve(
    callerDir,
    filePath,
  )
  return absFilePath
}

/**
 * create an object instance (via the new operator),
 * but pass an arbitrary number of arguments to the constructor.
 * https://stackoverflow.com/a/8843181/1123955
 */
// eslint-disable-next-line
export function newCall (cls: any, ..._: any[]) {
  const instance = new (Function.prototype.bind.apply(cls, arguments))()
  return instance
}

export function initProxyModule (absFilePath: string): any {
  log.silly('HotImport', 'initProxyModule(%s)', absFilePath)

  if (!(absFilePath in moduleStore)) {
    throw new Error(`moduleStore has no ${absFilePath}!`)
  }

  const proxyModule = function (this: any, ...args: any[]): any {
    log.silly('HotImport', 'initProxyModule() proxyModule()')

    let realModule = moduleStore[absFilePath]
    if (!realModule) {
      log.error('HotImport', 'initProxyModule() proxyModule() moduleStore[%s] empty!', absFilePath)
      throw new Error('Cannot get realModule from moduleStore for ' + absFilePath)
    }

    // use default by default.
    // `hotMod = hotImport(...) v.s. import hotMod from '...'
    if (typeof realModule.default === 'function') {
      log.silly('HotImport', 'initProxyModule() proxyModule() using default export')
      realModule = realModule.default
    }

    if (typeof realModule !== 'function') {
      throw new TypeError('is not a function')
    }
    // https://stackoverflow.com/a/31060154/1123955
    if (new.target) { // called with constructor: `new HotMod()`
      return newCall(realModule, ...args)
    }
    // called without constructor: `hotMethod()`
    return realModule.apply(this, args)
  }
  return proxyModule
}

export async function importFile (absFilePath: string): Promise<any> {
  log.silly('HotImport', 'importFile(%s)', absFilePath)

  if (!path.isAbsolute(absFilePath)) {
    throw new Error('must be absolute path!')
  }

  try {
    const realModule = await import(absFilePath)
    return realModule
  } catch (e) {
    log.error('HotImport', 'importFile(%s) rejected: %s', absFilePath, e)
    throw e
  }
}

export function purgeRequireCache (absFilePath: string): any {
  log.silly('HotImport', 'purgeRequireCache(%s)', absFilePath)
  const mod = require.resolve(absFilePath)
  const oldCache = require.cache[mod]
  if (!oldCache) {
    throw new Error(`oldCache not found for mod:${mod}`)
  }
  delete require.cache[mod]
  return oldCache
}

export function restoreRequireCache (absFilePath: string, cache: any): void {
  log.silly('HotImport', 'restoreRequireCache(%s, cache)', absFilePath)
  const mod = require.resolve(absFilePath)
  require.cache[mod] = cache
}

export {
  log,
}
export default hotImport
