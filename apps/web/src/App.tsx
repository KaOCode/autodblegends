import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./lib/AppContext";
import { Layout } from "./components/Layout";
import { InventoryPage } from "./pages/InventoryPage";
import { TeamBuilderPage } from "./pages/TeamBuilderPage";
import { EventsPage } from "./pages/EventsPage";

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<InventoryPage />} />
            <Route path="team-builder" element={<TeamBuilderPage />} />
            <Route path="events" element={<EventsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
