import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  InputAdornment,
} from "@mui/material";

const BASE_URL = "https://wmhsl-real-estate-backend.vercel.app";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const body = await res.json();
      // Expect { access_token: '...', user: {...} }
      const token = body.access_token || body.token || body.accessToken;
      if (!token) throw new Error("Missing token in response");
      localStorage.setItem("auth_token", token);
      localStorage.setItem("auth_user", JSON.stringify(body.user || {}));
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "70vh", p: 2 }}>
      <Card sx={{ width: 420, maxWidth: "100%", boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Welcome back</Typography>
          <Typography variant="body2" sx={{ color: "#6b7280", mb: 3 }}>Sign in to continue to your dashboard</Typography>

          <Box component="form" onSubmit={onSubmit}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start">📧</InputAdornment> }}
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

            {error && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>{error}</Typography>
            )}

            <Button type="submit" className="submit-btn" variant="contained" fullWidth disabled={loading} sx={{ mt: 2 }}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </Box>

          <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#6b7280' }}>
            Tip: This form expects your backend at /api/v1/auth/login to return an access token
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
