import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useTranslate } from '../../../i18n/useTranslate';
import roFlag from '../../../assets/flags/ro.svg';
import usFlag from '../../../assets/flags/us.svg';
import Modal from '../../Shared/Modal/Modal';
import my_logo from './../../../assets/logo/logo-no-background.png';
import { GiHamburgerMenu } from 'react-icons/gi';
import { MdDarkMode, MdLightMode } from 'react-icons/md';
import styles from './NavBar.module.css';

// State type for modal visibility and message
type ShowModalState = {
  isVisible: boolean;
  message: string;
};

const NavBar: React.FC = () => {
  const { user, logout } = useAuth(); // Access current user and logout function from auth context
  const [showModal, setShowModal] = useState<ShowModalState>({ isVisible: false, message: '' });
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Toggle state for mobile menu
  const { theme, toggleTheme } = useTheme(); // Access theme and toggle function
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false); // State to control whether the language dropdown menu is open or not
  const { language, toggleLanguage } = useLanguage(); // Access language state and toggle function
  const t = useTranslate(); // Translation hook

  // Function to close menu
  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // Trigger logout confirmation modal
  const logOut = () => {
    setShowModal({ isVisible: true, message: t('confirmLogout') });
    closeMenu();
  };

  // Handle confirmation: perform logout and close modal
  const onYes = () => {
    setShowModal({ isVisible: false, message: '' });
    logout();
  };

  // Handle cancel: just close the modal
  const onNo = () => {
    setShowModal({ isVisible: false, message: '' });
  };

  // Toggle the language dropdown menu open/closed
  const toggleLangMenu = () => {
    setIsLangMenuOpen((prev) => !prev);
  };

  // Handle language selection: only toggle if it's a different language
  const handleSelectLang = (lang: 'en' | 'ro') => {
    if (language !== lang) toggleLanguage(); // Call context toggle function to change language
    setIsLangMenuOpen(false); // Always close the dropdown after selection
  };

  return (
    <div className={styles.navbar}>
      <div className={styles.navbarContainer}>
        <div className={styles.navbarLeftSide}>
          <div className={styles.navbarLogo}>
            <a href="/" className={styles.navbarLink}>
              <img src={my_logo} alt="Logo" />
            </a>
            <h2 className={styles.navbarHeading}>Unlock the Door to Your Dream Flat!</h2>
          </div>

          <div className={styles.navbarLeftSideGreetingTheme}>
            {/* Greeting, theme and language toggle */}
            <div className={styles.userGreeting}>
              {t('greeting')}, {user ? `${user.firstName} ${user.lastName}` : t('guest')}
              {user?.role === 'admin' && ` (${t('admin')})`}!
            </div>

            {/* Theme toggle button */}
            <button
              onClick={toggleTheme}
              className={styles.themeToggle}
              title={
                theme === 'dark'
                  ? t('themeToggleLight') // e.g. 'Switch to Light Mode'
                  : t('themeToggleDark') // e.g. 'Switch to Dark Mode'
              }
            >
              {theme === 'dark' ? <MdLightMode className={styles.sunIcon} /> : <MdDarkMode className={styles.moonIcon} />}
            </button>

            {/* Language toggle */}
            <div className={styles.languageDropdown}>
              <button className={styles.languageToggle} onClick={toggleLangMenu}>
                <span className={styles.languageOption}>
                  <img src={language === 'en' ? usFlag : roFlag} alt="flag" className={styles.flagIcon} />
                  {language === 'en' ? 'US' : 'RO'}
                </span>
              </button>

              {isLangMenuOpen && (
                <div className={styles.languageMenu}>
                  <button onClick={() => handleSelectLang('en')}>
                    <span className={styles.languageOption}>
                      <img src={usFlag} alt="US flag" className={styles.flagIcon} />
                      US
                    </span>
                  </button>
                  <button onClick={() => handleSelectLang('ro')}>
                    <span className={styles.languageOption}>
                      <img src={roFlag} alt="RO flag" className={styles.flagIcon} />
                      RO
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <button className={styles.hamburger} onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <GiHamburgerMenu />
        </button>

        <nav className={`${styles.navLinks} ${isMenuOpen ? styles.showMenu : ''}`}>
          {!user ? (
            <>
              <NavLink to="/login" className={({ isActive }) => (isActive ? styles.active : '')} onClick={closeMenu}>
                {t('login')}
              </NavLink>
              <NavLink to="/forgot-password" className={({ isActive }) => (isActive ? styles.active : '')} onClick={closeMenu}>
                {t('forgotPassword')}
              </NavLink>
              <NavLink to="/register" className={({ isActive }) => (isActive ? styles.active : '')} onClick={closeMenu}>
                {t('register')}
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/myFlats" className={({ isActive }) => (isActive ? styles.active : '')} onClick={closeMenu}>
                {t('myFlats')}
              </NavLink>
              <NavLink to="/favorites" className={({ isActive }) => (isActive ? styles.active : '')} onClick={closeMenu}>
                {t('favorites')}
              </NavLink>
              <NavLink to="/flats/new" className={({ isActive }) => (isActive ? styles.active : '')} onClick={closeMenu}>
                {t('newFlat')}
              </NavLink>
              <NavLink to={`/profile`} className={({ isActive }) => (isActive ? styles.active : '')} onClick={closeMenu}>
                {t('myProfile')}
              </NavLink>
              {user?.role === 'admin' && (
                <NavLink to="/admin/all-users" className={({ isActive }) => (isActive ? styles.active : '')} onClick={closeMenu}>
                  {t('allUsers')}
                </NavLink>
              )}
              <button onClick={logOut} className={styles.logoutButton}>
                {t('logout')}
              </button>
            </>
          )}
        </nav>
      </div>

      {showModal.isVisible && <Modal message={showModal.message} onYes={onYes} onNo={onNo} />}
    </div>
  );
};

export default NavBar;
