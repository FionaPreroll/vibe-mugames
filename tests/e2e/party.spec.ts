import { expect, test } from './coverage'
import { phone, seat } from './helpers'

/**
 * The party games between phones: Mäxchen, where only the roller sees the dice, and Werwolf,
 * where each phone knows only its own role, and on one device handed round.
 */

test('two phones play Mäxchen: the roller alone sees the dice, a doubt lifts the cup', async ({
  browser,
}) => {
  const ada = await phone(browser, 'Ada')
  const bo = await phone(browser, 'Bo')
  await ada.getByRole('button', { name: 'Open a table' }).click()
  await seat(ada, bo)
  await ada.getByRole('button', { name: 'Mäxchen' }).click()
  await expect(bo.locator('.status.turn')).toHaveText('Ada rolls.')
  await ada.getByRole('button', { name: 'Roll', exact: true }).click()
  await expect(ada.locator('.cup.open')).toBeVisible()
  await expect(bo.locator('.status.turn')).toHaveText('Ada looks under the cup.')
  await expect(bo.locator('.cup.open')).toHaveCount(0)

  // Ada says the highest throw, whatever she rolled: Bo may only doubt or give up.
  await ada.locator('.claims .maexchen').click()
  await expect(bo.locator('.said')).toHaveText('Ada says: Mäxchen')
  await expect(bo.getByRole('button', { name: 'Believe it and roll' })).toHaveCount(0)
  await bo.getByRole('button', { name: 'Doubt it: lift the cup' }).click()
  for (const page of [ada, bo]) {
    await expect(page.locator('.hint').first()).toContainText('Bo doubted Ada’s Mäxchen')
  }
  const lost = await bo.locator('.lives .hearts').allTextContents()
  expect(lost.join(' ')).toContain('♡')
})

test('four phones play a night and a day of Werwolf, each knowing only its own role', async ({
  browser,
}) => {
  const names = ['Ada', 'Bo', 'Cy', 'Di']
  const phones = await Promise.all(names.map((name) => phone(browser, name)))
  const [ada] = phones
  if (!ada) throw new Error('no host')
  await ada.getByRole('button', { name: 'Open a table' }).click()
  for (const player of phones.slice(1)) await seat(ada, player)
  await ada.getByRole('button', { name: 'Werewolf' }).click()

  const roles = await Promise.all(phones.map((page) => page.locator('.role strong').textContent()))
  expect(roles.filter((role) => role?.includes('werewolf'))).toHaveLength(1)
  expect(roles.filter((role) => role?.includes('seer'))).toHaveLength(1)

  // Night: everyone taps someone, wolves and villagers alike.
  for (const [i, page] of phones.entries()) {
    await page.locator('.choices button').first().click()
    // The last one to choose ends the night.
    if (i < phones.length - 1) await expect(page.locator('.chosen')).toHaveText(/^You chose/)
  }
  for (const page of phones) await expect(page.locator('.news')).toContainText('Night 1')
  await expect(ada.locator('.status.turn')).toContainText('Day 1')
})

test('four hand one device round for Werwolf, each seeing only their own role', async ({
  browser,
}) => {
  const page = await phone(browser, 'Ada')
  await page.getByRole('button', { name: 'Play on this device' }).click()
  await page.getByRole('group', { name: 'Players' }).getByRole('button', { name: '4' }).click()
  for (const [i, name] of ['Ada', 'Bo', 'Cy', 'Di'].entries()) {
    await page.getByLabel(`Name of player ${i + 1}`).fill(name)
  }
  await page.getByLabel('One screen, taking turns').check()
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: /^Werewolf/ }).click()
  for (const name of ['Ada', 'Bo', 'Cy', 'Di']) {
    await expect(page.locator('.status.turn')).toHaveText(
      `Pass the device to ${name}. Only ${name} looks now.`,
    )
    await expect(page.locator('.role')).toHaveCount(0)
    await page.getByRole('button', { name: `I am ${name}: show my role` }).click()
    await expect(page.locator('.role strong')).toContainText(`${name}, you are a`)
    await page.locator('.choices button').first().click()
    if (name !== 'Di') await page.getByRole('button', { name: /^Done: hand over to/ }).click()
  }
  await expect(page.locator('.news')).toContainText('Night 1')
})

test('two phones play Schwimmen: each sees only its own hand, and a knock shows them all', async ({
  browser,
}) => {
  const ada = await phone(browser, 'Ada')
  const bo = await phone(browser, 'Bo')
  await ada.getByRole('button', { name: 'Open a table' }).click()
  await seat(ada, bo)
  await ada.getByRole('button', { name: 'Schwimmen' }).click()
  const hand = (page: typeof ada) => page.getByRole('group', { name: 'Your cards' })
  await expect(hand(ada).getByRole('button')).toHaveCount(3)
  await expect(hand(bo).getByRole('button')).toHaveCount(3)
  const adaCards = await hand(ada).getByRole('button').allTextContents()
  const boCards = await hand(bo).getByRole('button').allTextContents()
  expect(adaCards).not.toEqual(boCards)
  // A hand dealt 31 ends the round at once: only then is it not Ada's turn first.
  test.skip(
    (await ada.locator('.status.turn').textContent()) !== 'Your turn',
    'a hand of 31 was dealt',
  )
  await expect(bo.locator('.status.turn')).toHaveText('Ada’s turn')

  // Ada swaps her first card for the middle's first, then Bo knocks, and Ada has one more turn.
  await hand(ada).getByRole('button').first().click()
  await ada.getByRole('group', { name: 'The middle' }).getByRole('button').first().click()
  await expect(bo.locator('.hint').first()).toContainText('Ada gave')
  await bo.getByRole('button', { name: 'Knock' }).click()
  await expect(ada.locator('.hint')).toContainText([
    'Bo knocked: this is your last turn before the hands are shown.',
  ])
  await ada.getByRole('button', { name: 'Pass' }).click()
  // The hands are shown, and the next round begins.
  await expect(bo.locator('.swim-reveal')).toBeVisible()
  await expect(bo.locator('.swim-reveal li')).toHaveCount(2)
})
