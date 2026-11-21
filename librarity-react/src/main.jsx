import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/main.css'
import './styles/theme.css'
import './styles/animations.css'
import './styles/responsive.css'
import './styles/game-ui-fixes.css'
import './styles/mobile.css'
import './styles/wordle.css'
import './styles/spelling-bee.css'
import './styles/word-ladder.css'
import './styles/trivia.css'
import './styles/flashcards.css'
import './styles/wikipedia-race.css'
import './styles/tools.css'
import './styles/leaderboard.css'
import './styles/visitor-logbook.css'
import './styles/library-home.css'
import './styles/carousel.css'
import './styles/icon-placeholders.css'
import './styles/react-app.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)