import { Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import FilterBar from './components/FilterBar'
import Dashboard from './pages/Dashboard'
import Lista from './pages/Lista'
import Mapa from './pages/Mapa'
import Raio from './pages/Raio'

export default function App() {
  return (
    <>
      <Nav />
      <FilterBar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/lista" element={<Lista />} />
        <Route path="/mapa" element={<Mapa />} />
        <Route path="/raio" element={<Raio />} />
      </Routes>
    </>
  )
}
