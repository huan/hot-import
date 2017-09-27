// See:
// https://github.com/rayosu/hot-require/blob/master/hot-require.js
// http://blog.chatie.io/developer/2017/03/20/added-hot-reload-for-bots.html
import * as path    from 'path'

const callerPath      = require('caller-path')
import { FSWatcher }  from 'chokidar'

import { log }        from 'brolog'

export let theModule: any
export function debugSetModule(m: any): void {
  theModule = m
}

export const fsWatcher = initFileWatcher()

function initFileWatcher() {
  const watcher = new FSWatcher()

  watcher
  .on('add', filePath => log.verbose('HotImport', `watcher.on(add) File ${filePath} has been added`))
  .on('change', async filePath => {
    log.verbose('HotImport', 'watcher.on(change, %s)', filePath)

    try {
      const newModule = await importFile(filePath)
      purgeRequireCache(filePath)
      theModule = newModule
      cloneProperties(theModule, moduleProxy)
      log.verbose('HotImport', 'watcher.on(change, %s) Hot Module Re-Imported', filePath)
    } catch (e) {
      log.error('HotImport', 'watcher.on(change, %s) exception: %s', filePath, e)
    }
  })
  .on('error', (error, filePath) => {
    log.error('HotImport', 'watchFile(%s) watcher.on(error) '
                            + 'closing watcher because: %s',
                            filePath, error)
    watcher.close()
  })

  return watcher
}

export async function hotImport(id: string): Promise<any> {
  log.verbose('HotImport', 'hotImport(%s)', id)

  if (!theModule) {
    log.verbose('HotImport', 'hotImport(%s) init theModule...', id)
    const absoluteFilePath = callerResolve(id)
    theModule = await importFile(absoluteFilePath)
    cloneProperties(theModule, moduleProxy)
    fsWatcher.add(absoluteFilePath)

    // fsWatcher.on(ready) must be called after .add(path)
    await new Promise(resolve => fsWatcher.once('ready', resolve))

    console.log('Watched', fsWatcher.getWatched())
  }
  return moduleProxy
}

export function cloneProperties(src: any, dst: any) {
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

  const absoluteFilename = path.resolve(
    callerDir,
    id,
  )
  return absoluteFilename
}

// create an object instance (via the new operator),
// but pass an arbitrary number of arguments to the constructor.
// https://stackoverflow.com/a/8843181/1123955
export function newCall(cls: any, ..._: any[]) {
  const instance = new (Function.prototype.bind.apply(cls, arguments))
  return instance
}

// export function construct(constructor: any, args?: any[]) {
//   function F(this: any): void {
//       constructor.apply(this, args)
//   }
//   F.prototype = constructor.prototype
//   return new (F as any)()
// }

export function moduleProxy(this: any, ...args: any[]): any {
  if (!theModule) {
    throw new Error('theModule not set!')
  }
  if (this) { // for `new HotImport()`
    return newCall(theModule, ...args)
  } else {    // for just `hotImport()`
    return theModule.apply(theModule, args)
  }
}

export async function importFile(id: string): Promise<any> {
  log.verbose('HotImport', 'importFile(%s)', id)
  try {
    return await import(id)
  } catch (e) {
    log.error('HotImport', 'importFile(%s) rejected: %s', id, e)
  }
}

export function purgeRequireCache(id: string): void {
  log.verbose('HotImport', 'purgeRequireCache(%s)', id)
  const mod = require.resolve(id)
  // console.log('mod', mod)
  // console.log('cache', require.cache[mod])
  delete require.cache[mod]
}

export default hotImport
