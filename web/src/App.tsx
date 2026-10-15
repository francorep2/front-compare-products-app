import { Navigate, Route, Routes } from "react-router-dom";
import { MainLayout } from "./components/Layout";
import { Forgot, Login, Register } from "./pages/Auth";
import { Compare } from "./pages/Compare";
import { Home } from "./pages/Home";
import { ListDetail, NewList, Purchases } from "./pages/Lists";
import { Profile, ProfileEdit } from "./pages/Profile";
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
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/list/:id" element={<ListDetail />} />
        <Route path="/compare/:taskId" element={<Compare />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/edit" element={<ProfileEdit />} />
      </Route>
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
