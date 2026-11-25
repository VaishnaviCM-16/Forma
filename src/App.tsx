import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import LandingPage from './marketing/LandingPage';
import { ThemeProvider } from './themes/ThemeProvider';

const Workspace = lazy(() => import('./editor/Workspace'));

function RouteLoading() {
  return <main className="workspace-loading"><span className="brand-mark"><i/><i/><i/><i/></span><span>Preparing your canvas…</span></main>;
}

export default function App() {
  return <ThemeProvider><Suspense fallback={<RouteLoading/>}>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/canvas/:boardId" element={<Workspace />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
  </Suspense></ThemeProvider>;
}
