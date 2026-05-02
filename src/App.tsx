import { BrowserRouter } from 'react-router-dom'
import { AuthSessionProvider } from '@/features/auth/useAuthSession'
import { AppRouter } from './routes/AppRouter'
import './index.css'

export default function MainApp() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthSessionProvider>
        <AppRouter />
      </AuthSessionProvider>
    </BrowserRouter>
  )
}
