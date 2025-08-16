import React from 'react';
import TopBar from '../../components/common/TopBar/TopBar.jsx';
import Footer from '../../components/common/Footer/Footer.jsx';
import '../../assets/css/global.css';

const MainLayout = ({ children }) => {
  return (
    <div className="main-layout">
      <TopBar />
      <main className="main-content">{children}</main>
      <Footer />
    </div>
  );
};

export default MainLayout;