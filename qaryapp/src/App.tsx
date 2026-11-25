import { AppProviders } from './app/providers'
import { AppRouter } from './app/router'
import { SplashScreen } from './components/layout/SplashScreen'

function App() {
  return (
    <AppProviders>
      <SplashScreen />
      <AppRouter />
    </AppProviders>
  )
}

export default App
