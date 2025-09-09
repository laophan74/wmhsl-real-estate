import * as React from "react";
import { Link as RouterLink } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import MenuIcon from "@mui/icons-material/Menu";
import "./TopBar.css";

const navLinks = [
  { label: "PROPERTY REPORT", to: "/properties" },
  { label: "BUY", to: "/properties?type=buy" },
  { label: "SELL", to: "/properties?type=sell" },
  { label: "RENT", to: "/properties?type=rent" },
  { label: "ABOUT US", to: "/about" },
  { label: "JOIN US", to: "/join" },
  { label: "CONTACT", to: "/contact" },
];

export default function TopBar() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <AppBar position="sticky" color="default" elevation={0} className="topbar">
        <Toolbar sx={{ minHeight: 72, px: { xs: 2, md: 4 } }}>
          {/* Logo */}
          <Box
            component={RouterLink}
            to="/"
            sx={{ display: "flex", alignItems: "center", gap: 1, textDecoration: "none" }}
          >
            <Box className="stone-logo">STONE</Box>
          </Box>


          {/* Desktop nav */}
          <Box sx={{ ml: "auto", display: { xs: "none", md: "flex" }, gap: 1 }}>
            {navLinks.map((item) => (
              <Button
                key={item.label}
                component={RouterLink}
                to={item.to}
                className="topbar-link"
              >
                {item.label}
              </Button>
            ))}
          </Box>

          {/* Burger button (mobile) */}
          <IconButton
            edge="end"
            sx={{ ml: "auto", display: { xs: "inline-flex", md: "none" } }}
            onClick={() => setOpen(true)}
            aria-label="open navigation"
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Drawer for mobile */}
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 280 }} role="presentation" onClick={() => setOpen(false)}>
          <List>
            {navLinks.map((item) => (
              <ListItem disablePadding key={item.label}>
                <ListItemButton component={RouterLink} to={item.to}>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
}
