import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import './Footer.css';

const Footer = () => {
  return (
    <Box component="footer" className="footer">
      <Container maxWidth="lg">
        <Typography variant="body1" align="center">
          © {new Date().getFullYear()} Stone Real Estate.
        </Typography>
        <Typography variant="body2" align="center" mt={1}>
          123 Paramatta Street, Sydney, Australia
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;