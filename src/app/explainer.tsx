// Explainer route — "What is LUVR". Reachable pre-login (welcome screen) and
// post-login (Profile tab). No tab bar (it lives outside the (tabs) group).

import { router } from 'expo-router';

import ExplainerScreen from '@/screens/ExplainerScreen';

export default function ExplainerRoute() {
  return <ExplainerScreen onClose={() => router.back()} />;
}
