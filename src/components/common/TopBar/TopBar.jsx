import React from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import './TopBar.css';

const TopBar = () => {
  return (
    <AppBar position="static" className="top-bar">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          WMHSL Real Estate
        </Typography>
        <Button color="inherit">Home</Button>
        <Button color="inherit">Properties</Button>
        <Button color="inherit">About</Button>
        <Button color="inherit">Contact</Button>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;