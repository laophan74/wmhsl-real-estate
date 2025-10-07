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
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import "./TopBar.css";
import { useAuth } from "../../../auth/useAuth";
// Removed icon usage for Dashboard/Login per updated requirements

const navLinks = [
  // Additional text links can be added here
];

export default function TopBar() {
  const [open, setOpen] = React.useState(false);
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const openMenu = Boolean(anchorEl);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => setAnchorEl(null);

  return (
    <>
      <AppBar position="sticky" color="default" elevation={0} className="topbar">
        <Toolbar sx={{ minHeight: 72, px: { xs: 2, md: 4 } }}>
          {/* Logo */}
          <Box component={RouterLink} to="/" sx={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img src="/src/assets/images/logo.png" alt="Stone" className="logo-img" />
          </Box>


          {/* Desktop nav */}
          <Box sx={{ ml: "auto", display: { xs: "none", md: "flex" }, gap: 1, alignItems: "center" }}>
            {user && (
              <Button component={RouterLink} to="/dashboard" className="topbar-link">Dashboard</Button>
            )}
            {!user && (
              <Button component={RouterLink} to="/login" className="topbar-link">Log In</Button>
            )}
            {user && (
              <>
                <IconButton aria-label="account" onClick={handleMenuOpen} size="large">
                  <AccountCircleIcon />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={openMenu}
                  onClose={handleMenuClose}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  <MenuItem component={RouterLink} to="/profile" onClick={handleMenuClose}>Profile</MenuItem>
                  <Divider />
                  <MenuItem onClick={() => { handleMenuClose(); logout(); }}>Log out</MenuItem>
                </Menu>
              </>
            )}
          </Box>

          {/* Burger button (mobile) */}
          <Box sx={{ ml: "auto", display: { xs: "inline-flex", md: "none" }, alignItems: "center", gap: 1 }}>
            {user && (
              <Button component={RouterLink} to="/dashboard" className="topbar-link" sx={{ minWidth: 'auto' }}>Dashboard</Button>
            )}
            {!user && (
              <Button component={RouterLink} to="/login" className="topbar-link" sx={{ minWidth: 'auto' }}>Log In</Button>
            )}
            {user && (
              <IconButton aria-label="account" onClick={handleMenuOpen} size="large">
                <AccountCircleIcon />
              </IconButton>
            )}
            <IconButton edge="end" onClick={() => setOpen(true)} aria-label="open navigation">
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer for mobile */}
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 280 }} role="presentation" onClick={() => setOpen(false)}>
          <List>
            {user && (
              <ListItem disablePadding>
                <ListItemButton component={RouterLink} to="/dashboard">
                  <ListItemText primary="Dashboard" />
                </ListItemButton>
              </ListItem>
            )}
            {navLinks.map((item) => (
              <ListItem disablePadding key={item.label}>
                <ListItemButton component={RouterLink} to={item.to}>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
            {!user && (
              <ListItem disablePadding>
                <ListItemButton component={RouterLink} to="/login">
                  <ListItemText primary="Log In" />
                </ListItemButton>
              </ListItem>
            )}
            {user && (
              <>
                <ListItem disablePadding>
                  <ListItemButton component={RouterLink} to="/profile">
                    <ListItemText primary="Profile" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton onClick={logout}>
                    <ListItemText primary="Log out" />
                  </ListItemButton>
                </ListItem>
              </>
            )}
          </List>
        </Box>
      </Drawer>
    </>
  );
}
