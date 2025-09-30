import React from "react";
import { useAuth } from "../../auth/useAuth";
import { Box, Card, CardContent, Typography, Divider, Chip } from "@mui/material";

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h6">You are not signed in.</Typography>
      </Box>
    );
  }

  const rows = [
    { label: "ID", value: user.id || user.user_id || "-" },
    { label: "Email", value: user.email || "-" },
    { label: "Username", value: user.username || "-" },
    { label: "Name", value: user.name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || "-" },
    { label: "Role", value: user.role || user.metadata?.role || "-" },
    { label: "Created", value: user.metadata?.created_at || user.created_at || "-" },
  ];

  return (
    <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
      <Card sx={{ width: 720, maxWidth: "100%", boxShadow: "0 10px 30px rgba(0,0,0,0.08)", borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
            Profile
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: "grid", gridTemplateColumns: "180px 1fr", rowGap: 1.5, columnGap: 2 }}>
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
    </Box>
  );
}
