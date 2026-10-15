import { Navigate, Route, Routes } from "react-router-dom";
import { MainLayout } from "./layout/Shell";
import { Forgot, Login, Register } from "./pages/Auth";
import { Compare } from "./pages/Compare";
import { Diff } from "./pages/Diff";
import { Home } from "./pages/Home";
import { ListDetail } from "./pages/ListDetail";
import { Lists } from "./pages/Lists";
import { NewList } from "./pages/NewList";
import { Profile } from "./pages/Profile";
import { Search } from "./pages/Search";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot" element={<Forgot />} />
      <Route element={<MainLayout />}>
        <Route path="/home" element={<Home />} />
        <Route path="/new-list" element={<NewList />} />
        <Route path="/search" element={<Search />} />
        <Route path="/lists" element={<Lists />} />
        <Route path="/purchases" element={<Navigate to="/lists" replace />} />
        <Route path="/list/:id" element={<ListDetail />} />
        <Route path="/compare/diff" element={<Diff />} />
        <Route path="/compare/:taskId" element={<Compare />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
