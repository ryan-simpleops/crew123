import { Link } from 'react-router-dom';
import './Navigation.css';

function Navigation() {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          Crew<span className="logo-highlight">123</span>
        </Link>

        <ul className="nav-menu">
          <li className="nav-item">
            <Link to="/" className="nav-link">Home</Link>
          </li>
          <li className="nav-item">
            <Link to="/contact" className="nav-link">Contact</Link>
          </li>
          <li className="nav-item">
            <Link to="/sms-terms" className="nav-link">SMS Terms</Link>
          </li>
          <li className="nav-item">
            <Link to="/crew-opt-in" className="nav-link">Crew Opt-In</Link>
          </li>
          <li className="nav-item">
            <Link to="/hirer-signup">
              <button className="nav-btn">Sign Up</button>
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navigation;
