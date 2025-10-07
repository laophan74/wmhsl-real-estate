import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { Box, Card, CardContent, TextField, Button, Typography, InputAdornment, Snackbar, Alert } from "@mui/material";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [toast, setToast] = useState({ open: false, type: 'success', message: '' });

  // Basic client validation rules
  function validate(u, p){
    const errs = {};
    const nu = (u||'').trim();
    if(!nu) errs.username = 'Username is required';
    else if(nu.length < 3) errs.username = 'At least 3 characters';
    else if(!/^[a-z0-9._-]+$/i.test(nu)) errs.username = 'Only letters, numbers, . _ -';
    if(!p) errs.password = 'Password is required';
    else if(p.length < 6) errs.password = 'Min 6 characters';
    return errs;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    const errs = validate(username, password);
    if(Object.keys(errs).length){
      setFieldErrors(errs);
      return;
    }
    setLoading(true);
    const res = await login(username, password);
    setLoading(false);
    if (res.ok){
      setToast({ open:true, type:'success', message:'Signed in successfully' });
      setTimeout(()=> navigate('/dashboard'), 600);
    } else {
      setError(res.message || 'Login failed. Please try again.');
      setToast({ open:true, type:'error', message: res.message || 'Login failed' });
    }
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
              value={username}
              onChange={(e) => { setUsername(e.target.value); if(fieldErrors.username) setFieldErrors(f=>({ ...f, username: undefined })); }}
              error={!!fieldErrors.username}
              helperText={fieldErrors.username}
              InputProps={{ startAdornment: <InputAdornment position="start">👤</InputAdornment> }}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              required
              margin="normal"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if(fieldErrors.password) setFieldErrors(f=>({ ...f, password: undefined })); }}
              error={!!fieldErrors.password}
              helperText={fieldErrors.password}
              InputProps={{ startAdornment: <InputAdornment position="start">🔒</InputAdornment> }}
            />

            {error && <Typography variant="body2" color="error" sx={{ mt: 1 }}>{error}</Typography>}

            <Button type="submit" className="submit-btn" variant="contained" fullWidth disabled={loading} sx={{ mt: 2 }}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </Box>

          <Snackbar
            open={toast.open}
            autoHideDuration={3000}
            onClose={() => setToast(t=>({ ...t, open:false }))}
            anchorOrigin={{ vertical:'top', horizontal:'center' }}
          >
            <Alert severity={toast.type} variant="filled" sx={{ width:'100%' }} onClose={() => setToast(t=>({ ...t, open:false }))}>
              {toast.message}
            </Alert>
          </Snackbar>

        </CardContent>
      </Card>
    </Box>
  );
}
