import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/tokens.css'
import './styles/index.css'
import './styles/games.css'
import './styles/wordle.css'
import './styles/spelling-bee.css'
import './styles/word-ladder.css'
import './styles/trivia.css'
import './styles/flashcards.css'
import './styles/wikipedia-race.css'
import './styles/tools.css'
import './styles/leaderboard.css'
import './styles/visitor-logbook.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)