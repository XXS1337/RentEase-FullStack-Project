import React from 'react';
import { Outlet } from 'react-router-dom';

import NavBar from '../NavBar/NavBar';
import Footer from '../Footer/Footer';
import styles from './AppLayout.module.css';

const AppLayout: React.FC = () => {
  return (
    <div className="maxWidthContainer">
      <header>
        <NavBar />
      </header>

      <main className={styles.contentArea}>
        <Outlet />
      </main>

      <footer>
        <Footer />
      </footer>
    </div>
  );
};

export default AppLayout;
