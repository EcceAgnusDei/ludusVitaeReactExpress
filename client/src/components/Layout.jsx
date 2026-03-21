import { Outlet } from "react-router-dom";
import Header from "./Header";

function Layout() {
  return (
    <>
      {/* Header en haut */}
      <Header />
      {/* Zone où s'affichent les pages */}
      <Outlet /> {/* ← C'est ici que les pages apparaissent */}
    </>
  );
}

export default Layout;
