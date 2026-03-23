import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import Creations from "./pages/Creations";
import Game from "./pages/Game";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <Router>
      <Routes>
        {/* Routes avec layout commun */}
        <Route element={<Layout />}>
          <Route path="/" element={<Game />} />
          <Route path="/creations" element={<Creations />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
