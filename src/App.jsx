import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import Home from './pages/Home';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import SMSTerms from './pages/SMSTerms';
import Contact from './pages/Contact';
import HirerConsent from './pages/HirerConsent';
import CrewOptIn from './pages/CrewOptIn';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/sms-terms" element={<SMSTerms />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/hirer-signup" element={<HirerConsent />} />
            <Route path="/crew-opt-in" element={<CrewOptIn />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
