import { useState } from 'react'
import Onboarding from './screens/Onboarding'
import Pdv from './screens/Pdv'

type Tela = 'onboarding' | 'pdv'

export default function App() {
  const [tela, setTela] = useState<Tela>('onboarding')

  // Navegação por estado — no projeto real, um router.
  return tela === 'onboarding'
    ? <Onboarding onAbrirPdv={() => setTela('pdv')} />
    : <Pdv onVoltar={() => setTela('onboarding')} />
}
