
import * as React from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  TextField,
  Typography,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  MenuItem,
  Select,
  InputLabel,
} from "@mui/material";
import "./HomePage.css";


export default function HomePage() {
  const [selling, setSelling] = React.useState("no");
  const [timeframe, setTimeframe] = React.useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: send to backend (axios) or service
    alert("Submitted! (wire this up to your API)");
  };

  return (
    <Box className="home-hero">
      <Grid container className="home-grid" spacing={0}>
        {/* Left: image */}
        <Grid
          item
          xs={12}
          md={5}
          lg={4}
          className="hero-image"
          sx={{ minHeight: { xs: 200, md: 500 }, height: '100%' }}
        />


        {/* Right: form */}
  <Grid item xs={12} md={7} lg={8} className="form-col">
          <Card className="lead-card" elevation={0} sx={{ boxShadow: 'none', border: 'none' }}>
            <CardContent sx={{ p: { xs: 3, md: 5 } }}>
              <Typography variant="h4" className="lead-title" gutterBottom>
                Thank you for your interest in Stone Real Estate.
              </Typography>

              <Typography variant="body1" sx={{ mb: 3, color: "#4b5563" }}>
                Please fill out the form, we will get in touch with you soon.
              </Typography>

              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField label="First Name" fullWidth required />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Last Name" fullWidth required />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Email Address" type="email" fullWidth required />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Phone Number" fullWidth required />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Suburb" fullWidth />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl style={{ paddingRight: '10px' }}>
                      <FormLabel>Are you interested in selling a property?</FormLabel>
                      <RadioGroup
                        row
                        value={selling}
                        onChange={(e) => setSelling(e.target.value)}
                      >
                        <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                        <FormControlLabel value="no" control={<Radio />} label="No" />
                      </RadioGroup>
                    </FormControl>
                    <FormControl>
                      <FormLabel>Are you interested in buying a property?</FormLabel>
                      <RadioGroup
                        row
                        value={selling}
                        onChange={(e) => setSelling(e.target.value)}
                      >
                        <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                        <FormControlLabel value="no" control={<Radio />} label="No" />
                      </RadioGroup>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <Typography variant="subtitle1" sx={{ mb: 1 }}>
                        What is your expected timeframe for selling?
                      </Typography>
                      <Select
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value)}
                        displayEmpty
                        sx={{ minWidth: 200 }}
                      >
                        <MenuItem value=""><em>Choose…</em></MenuItem>
                        <MenuItem value="1m">~ 1 Month</MenuItem>
                        <MenuItem value="3m">~ 3 Months</MenuItem>
                        <MenuItem value="6m">~ 6 Months</MenuItem>
                        <MenuItem value="12m">~ 12+ Months</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="caption" className="privacy-note">
                      The information collected through this form may be used for marketing,
                      communication, and service delivery purposes by Stone Real Estate. We
                      respect your privacy and will handle your data in accordance with our
                      privacy policy.
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Button type="submit" variant="contained" className="submit-btn">
                      Submit
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
