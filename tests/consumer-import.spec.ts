#!/usr/bin/env ts-node
import * as path  from 'path'

// tslint:disable:no-shadowed-variable
import * as test  from 'blue-tape'

// import { log } from 'brolog'
// log.level('silly')

import {
  callerResolve,
  // makeCold,
}                 from '../src/hot-import'
import hotImport  from '../'

const MODULE_RELATIVE_PATH = './fixtures/meaning-of-life'

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
