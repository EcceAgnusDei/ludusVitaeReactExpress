import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import Creations from "./pages/Creations";
import Game from "./pages/Game";
import Dashboard, { MonEspaceTabPanel } from "./pages/Dashboard";
import { GridsExplore } from "./pages/GridsExplore";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <Router>
      <Routes>
        {/* Routes avec layout commun */}
        <Route element={<Layout />}>
          <Route path="/" element={<Game />} />
          <Route path="/creations" element={<Creations />} />
          <Route
            path="/recents"
            element={<GridsExplore variant="recent" />}
          />
          <Route
            path="/populaires"
            element={<GridsExplore variant="popular" />}
          />
          <Route path="/mon-espace" element={<Dashboard />}>
            <Route
              index
              element={<MonEspaceTabPanel variant="recent" />}
            />
            <Route
              path="populaires"
              element={<MonEspaceTabPanel variant="popular" />}
            />
            <Route
              path="aimees"
              element={<MonEspaceTabPanel variant="likes" />}
            />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
