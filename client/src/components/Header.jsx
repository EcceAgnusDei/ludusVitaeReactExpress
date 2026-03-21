import { useState } from "react";

import { NavLink } from "react-router-dom";

import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import MenuIcon from "@mui/icons-material/Menu";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";

const pages = [
  { name: "Jeu", root: "" },
  { name: "Populaires", root: "creations" },
  { name: "Récentes", root: "creations" },
];

function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: "#47d219" }}>
        <Toolbar>
          {/* Logo / Titre */}
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, fontWeight: "bold" }}
          >
            LudusVitae
          </Typography>

          {/* Navigation Desktop (visible sur écrans ≥ md) */}
          <Box sx={{ display: { xs: "none", md: "flex" }, gap: 2 }}>
            {pages.map((page) => (
              <Button
                component={NavLink}
                to={"/" + page.root}
                key={page.name}
                color="inherit"
                sx={{
                  textTransform: "none",
                  fontSize: "1rem",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
                }}
              >
                {page.name}
              </Button>
            ))}
          </Box>

          {/* Bouton Menu Mobile (visible sur petits écrans) */}
          <IconButton
            color="inherit"
            aria-label="menu"
            edge="end"
            onClick={handleDrawerToggle}
            sx={{ display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Drawer (menu latéral pour mobile) */}
      <Drawer anchor="right" open={mobileOpen} onClose={handleDrawerToggle}>
        <Box sx={{ width: 250 }} role="presentation">
          <List>
            {pages.map((page) => (
              <ListItem key={page} disablePadding>
                <ListItemButton onClick={handleDrawerToggle}>
                  <ListItemText primary={page} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
}

export default Header;
