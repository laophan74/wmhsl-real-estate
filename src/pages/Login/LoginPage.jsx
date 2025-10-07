import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { Box, Card, CardContent, TextField, Button, Typography, InputAdornment } from "@mui/material";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await login(email.trim().toLowerCase(), password);
    setLoading(false);
  if (res.ok) navigate("/dashboard");
  else setError(res.message || "Login failed. Please try again.");
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "70vh", p: 2 }}>
      <Card sx={{ width: 420, maxWidth: "100%", boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Welcome</Typography>
          <Typography variant="body2" sx={{ color: "#6b7280", mb: 3 }}>Sign in to continue</Typography>

          <Box component="form" onSubmit={onSubmit}>
            <TextField
              label="Username"
              type="text"
              fullWidth
              required
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start">�</InputAdornment> }}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              required
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start">🔒</InputAdornment> }}
            />

            {error && <Typography variant="body2" color="error" sx={{ mt: 1 }}>{error}</Typography>}

            <Button type="submit" className="submit-btn" variant="contained" fullWidth disabled={loading} sx={{ mt: 2 }}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </Box>

        </CardContent>
      </Card>
    </Box>
  );
}
