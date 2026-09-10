import { Route, Routes } from 'react-router-dom'
import Edit from './routes/Edit'
import Home from './routes/Home'
import View from './routes/View'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/view/:code" element={<View />} />
      <Route path="/edit/:code?" element={<Edit />} />
    </Routes>
  )
}
