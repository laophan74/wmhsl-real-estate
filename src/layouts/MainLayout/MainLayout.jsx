import React from 'react';
import TopBar from '../../components/common/TopBar/TopBar.jsx';
import Footer from '../../components/common/Footer/Footer.jsx';
import { Outlet } from 'react-router-dom';
import '../../assets/css/global.css';

const MainLayout = () => {
  return (
    <div className="main-layout">
      <TopBar />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
