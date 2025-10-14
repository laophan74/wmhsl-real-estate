import React, { useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { api } from "../../lib/api";
import { Box, Card, CardContent, Typography, Divider, Chip, TextField, Button, Alert, Snackbar } from "@mui/material";

export default function ProfilePage() {
  const { user } = useAuth();
  
  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [changingPassword, setChangingPassword] = useState(false);
  const [toast, setToast] = useState({ open: false, type: 'success', message: '' });

  // Debug user data
  console.log('ProfilePage - User data:', user);

  if (!user) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h6">You are not signed in.</Typography>
      </Box>
    );
  }

  // Password validation
  const validatePasswordForm = (form) => {
    const errors = {};
    
    if (!form.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    
    if (!form.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (form.newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters';
    }
    
    if (!form.confirmNewPassword) {
      errors.confirmNewPassword = 'Please confirm your new password';
    } else if (form.newPassword !== form.confirmNewPassword) {
      errors.confirmNewPassword = 'Passwords do not match';
    }
    
    if (form.currentPassword && form.newPassword && form.currentPassword === form.newPassword) {
      errors.newPassword = 'New password must be different from current password';
    }
    
    return errors;
  };

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    const errors = validatePasswordForm(passwordForm);
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }
    
    setChangingPassword(true);
    setPasswordErrors({});
    
    try {
      await api.post('/api/v1/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmNewPassword: passwordForm.confirmNewPassword
      });
      
      // Success
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setToast({ open: true, type: 'success', message: 'Password changed successfully!' });
      
    } catch (err) {
      console.error('Change password error:', err);
      console.error('Error response:', err?.response);
      console.error('Error data:', err?.response?.data);
      
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to change password';
      const errorCode = err?.response?.data?.error;
      const status = err?.response?.status;
      
      // Handle specific error codes
      if (errorCode === 'INVALID_CURRENT_PASSWORD') {
        setPasswordErrors({ currentPassword: 'Current password is incorrect' });
      } else if (errorCode === 'NEW_PASSWORD_SAME_AS_CURRENT') {
        setPasswordErrors({ newPassword: 'New password must be different from current password' });
      } else if (status === 500) {
        // Server error - likely backend issue
        setToast({ 
          open: true, 
          type: 'error', 
          message: 'Server error occurred. Please contact administrator. Error: ' + errorMessage 
        });
      } else {
        setToast({ open: true, type: 'error', message: errorMessage });
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handlePasswordFormChange = (field) => (e) => {
    const value = e.target.value;
    setPasswordForm(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user types
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Helper function to format date
  const formatDate = (dateValue) => {
    if (!dateValue) return "-";
    try {
      // Handle different date formats
      let date;
      if (typeof dateValue === 'string' || typeof dateValue === 'number') {
        date = new Date(dateValue);
      } else if (typeof dateValue === 'object') {
        // Handle Firestore Timestamp-like objects
        if (dateValue._seconds || dateValue.seconds) {
          const seconds = dateValue._seconds || dateValue.seconds;
          const nanoseconds = dateValue._nanoseconds || dateValue.nanoseconds || 0;
          date = new Date(seconds * 1000 + Math.floor(nanoseconds / 1e6));
        } else {
          date = new Date(dateValue);
        }
      }
      
      if (date && !isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    } catch (error) {
      console.error('Date formatting error:', error);
    }
    return "-";
  };

  // Helper function to format name
  const formatName = () => {
    // Try different name field combinations
    if (user.name) return user.name;
    
    const firstName = user.first_name || user.firstName || "";
    const lastName = user.last_name || user.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();
    
    return fullName || "-";
  };

  const rows = [
    { label: "ID", value: user.id || user.user_id || user.admin_id || "-" },
    { label: "Email", value: user.email || "-" },
    { label: "Username", value: user.username || "-" },
    { label: "Name", value: formatName() },
    { label: "Role", value: user.role || user.metadata?.role || "admin" },
    { label: "Created", value: formatDate(user.metadata?.created_at || user.created_at || user.createdAt) },
  ];

  return (
    <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
      <Box sx={{ width: 720, maxWidth: "100%", display: 'flex', flexDirection: 'column', gap: 3 }}>
        
        {/* Profile Info Card */}
        <Card sx={{ boxShadow: "0 10px 30px rgba(0,0,0,0.08)", borderRadius: 2 }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
              Profile Information
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "180px 1fr" }, rowGap: 1.5, columnGap: 2 }}>
              {rows.map((r) => (
                <React.Fragment key={r.label}>
                  <Typography sx={{ color: "#6b7280" }}>{r.label}</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{String(r.value)}</Typography>
                </React.Fragment>
              ))}
            </Box>

            {user.role && (
              <Box sx={{ mt: 3 }}>
                <Chip label={String(user.role).toUpperCase()} color="primary" variant="outlined" />
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card sx={{ boxShadow: "0 10px 30px rgba(0,0,0,0.08)", borderRadius: 2 }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
              Change Password
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Box component="form" onSubmit={handlePasswordChange} sx={{ maxWidth: 400 }}>
              <TextField
                label="Current Password"
                type="password"
                fullWidth
                margin="normal"
                value={passwordForm.currentPassword}
                onChange={handlePasswordFormChange('currentPassword')}
                error={!!passwordErrors.currentPassword}
                helperText={passwordErrors.currentPassword}
                disabled={changingPassword}
              />
              
              <TextField
                label="New Password"
                type="password"
                fullWidth
                margin="normal"
                value={passwordForm.newPassword}
                onChange={handlePasswordFormChange('newPassword')}
                error={!!passwordErrors.newPassword}
                helperText={passwordErrors.newPassword || 'Minimum 6 characters'}
                disabled={changingPassword}
              />
              
              <TextField
                label="Confirm New Password"
                type="password"
                fullWidth
                margin="normal"
                value={passwordForm.confirmNewPassword}
                onChange={handlePasswordFormChange('confirmNewPassword')}
                error={!!passwordErrors.confirmNewPassword}
                helperText={passwordErrors.confirmNewPassword}
                disabled={changingPassword}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmNewPassword}
                sx={{ mt: 3 }}
              >
                {changingPassword ? 'Changing Password...' : 'Change Password'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Toast Notifications */}
        <Snackbar
          open={toast.open}
          autoHideDuration={4000}
          onClose={() => setToast(prev => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert 
            severity={toast.type} 
            variant="filled" 
            sx={{ width: '100%' }}
            onClose={() => setToast(prev => ({ ...prev, open: false }))}
          >
            {toast.message}
          </Alert>
        </Snackbar>

      </Box>
    </Box>
  );
}
