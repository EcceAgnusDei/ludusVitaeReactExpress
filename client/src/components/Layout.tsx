import { Outlet } from "react-router-dom";
import Header from "./Header";

function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}

export default Layout;
