#!/usr/bin/env ts-node
import path from 'path'

// tslint:disable:no-shadowed-variable
import { test } from 'tstest'

// import { log } from 'brolog'
// log.level('silly')

import {
  callerResolve,
  // makeCold,
}                 from '../src/hot-import.js'
import hotImport  from '../src/mod.js'

const MODULE_RELATIVE_PATH = './fixtures/meaning-of-life.js'

test('hotImport', async t => {
  const hotMod = await hotImport(MODULE_RELATIVE_PATH)
  const mol = new hotMod.MeaningOfLife()
  t.equal(mol.answer, 42, 'should get 42 for meaning of life')
  await hotImport(MODULE_RELATIVE_PATH, false)
})

test('callerResolve', async t => {
  const EXPECTED_ABS_PATH = path.resolve(__dirname, MODULE_RELATIVE_PATH)
  const absFilePath = callerResolve(MODULE_RELATIVE_PATH)

  t.equal(absFilePath, EXPECTED_ABS_PATH, 'should resolve based on the consumer file path')
})
