import { Redirect } from 'expo-router'
import { getDb, getMeta } from '../data'

export default function Index() {
  const welcomed = getMeta(getDb(), 'welcome_done') === '1'
  return <Redirect href={welcomed ? '/(tabs)/today' : '/welcome'} />
}
