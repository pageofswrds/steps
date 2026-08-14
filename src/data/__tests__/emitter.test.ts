import { notify, subscribe } from '../emitter'

test('notify fires only listeners for the named tables', () => {
  const hits: string[] = []
  subscribe('entries', () => hits.push('entries'))
  subscribe('workouts', () => hits.push('workouts'))
  notify('entries')
  expect(hits).toEqual(['entries'])
  notify('entries', 'workouts')
  expect(hits).toEqual(['entries', 'entries', 'workouts'])
})

test('unsubscribe stops notifications', () => {
  let count = 0
  const unsub = subscribe('meta', () => count++)
  notify('meta')
  unsub()
  notify('meta')
  expect(count).toBe(1)
})
