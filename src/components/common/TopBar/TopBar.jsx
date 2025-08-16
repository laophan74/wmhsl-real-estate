import React from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import './TopBar.css';

const TopBar = () => {
  return (
    <AppBar position="static" className="top-bar">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          WMHSL Real Estate
        </Typography>
  <Button color="inherit" component={Link} to="/homepage">Home</Button>
  <Button color="inherit" component={Link} to="/properties">Properties</Button>
  <Button color="inherit" component={Link} to="/about">About</Button>
  <Button color="inherit" component={Link} to="/contact">Contact</Button>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;