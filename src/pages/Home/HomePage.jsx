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
  const [buying, setBuying] = React.useState("no");
  const [submitting, setSubmitting] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState("");
  const [showSubmittedMessage, setShowSubmittedMessage] = React.useState(false);
  const [submittedMessageText, setSubmittedMessageText] = React.useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage("");
    setSubmitting(true);
    try {
      const formEl = e.target;
      const formData = new FormData(formEl);
      const payload = {
        first_name: (formData.get("first_name") || "").trim(),
        last_name: (formData.get("last_name") || "").trim(),
        email: (formData.get("email") || "").toLowerCase(),
        phone: (formData.get("phone") || "").trim(),
        suburb: formData.get("suburb") || "",
    timeframe: formData.get("timeframe") || "",
    interested: formData.get("interested") || "no",
    interested_buying: formData.get("interested_buying") || "no",
      };

      const res = await fetch(
        "https://wmhsl-real-estate-backend.vercel.app/api/v1/leads/public",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server error ${res.status}: ${text}`);
      }

      const body = await res.json();
      // body may contain { reused, lead_id, score }
      const successMsg = body.reused
        ? `Lead already exists (id: ${body.lead_id}).`
        : `Lead created (id: ${body.lead_id}). Thank you!`;
      setStatusMessage(successMsg);

      // reset form controls
      formEl.reset();
      setSelling("no");
      setTimeframe("");
      setBuying("no");

      // fetch first message and switch UI to show it
      try {
        const resMsg = await fetch(
          "https://wmhsl-real-estate-backend.vercel.app/api/v1/messages?limit=100&offset=0"
        );
        if (resMsg.ok) {
          const json = await resMsg.json();
          const list = Array.isArray(json)
            ? json
            : Array.isArray(json?.value)
            ? json.value
            : [];
          const first = list[0];
          const text = ((first?.message ?? first?.content ?? first?.body ?? "") + "").trim();
          setSubmittedMessageText(text || "Thank you! We will get in touch soon.");
          setShowSubmittedMessage(true);
        } else {
          setSubmittedMessageText("Thank you! We will get in touch soon.");
          setShowSubmittedMessage(true);
        }
      } catch (_) {
        setSubmittedMessageText("Thank you! We will get in touch soon.");
        setShowSubmittedMessage(true);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage(`Failed to submit form: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
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
              {!showSubmittedMessage ? (
                <>
                  <Typography variant="h4" className="lead-title" gutterBottom>
                    Thank you for your interest in Stone Real Estate.
                  </Typography>

                  <Typography variant="body1" sx={{ mb: 3, color: "#4b5563" }}>
                    Please fill out the form, we will get in touch with you soon.
                  </Typography>

                  <Box component="form" onSubmit={handleSubmit}>
                    <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField name="first_name" label="First Name" fullWidth required />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField name="last_name" label="Last Name" fullWidth required />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField name="email" label="Email Address" type="email" fullWidth required />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField name="phone" label="Phone Number" fullWidth required />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel id="suburb-label">Suburb</InputLabel>
                      <Select
                        labelId="suburb-label"
                        name="suburb"
                        defaultValue="Asquith"
                        label="Suburb"
                      >
                        <MenuItem value="Asquith">Asquith</MenuItem>
                        <MenuItem value="Hornsby">Hornsby</MenuItem>
                        <MenuItem value="Waitara">Waitara</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <FormLabel>Are you interested in selling a property?</FormLabel>
                      <RadioGroup
                        row
                        name="interested"
                        value={selling}
                        onChange={(e) => setSelling(e.target.value)}
                      >
                        <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                        <FormControlLabel value="no" control={<Radio />} label="No" />
                      </RadioGroup>
                    </FormControl>
                  </Grid> */}

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <FormLabel>Are you interested in selling a property?</FormLabel>
                      <RadioGroup
                        row
                        name="interested"
                        value={selling}
                        onChange={(e) => setSelling(e.target.value)}
                      >
                        <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                        <FormControlLabel value="no" control={<Radio />} label="No" />
                      </RadioGroup>
                    </FormControl>
                    <FormControl fullWidth>
                      <FormLabel>Are you interested in buying a property?</FormLabel>
                      <RadioGroup
                        row
                        name="interested_buying"
                        value={buying}
                        onChange={(e) => setBuying(e.target.value)}
                      >
                        <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                        <FormControlLabel value="no" control={<Radio />} label="No" />
                      </RadioGroup>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <FormLabel>What is your expected timeframe for selling?</FormLabel>
                      <Select
                        name="timeframe"
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value)}
                        displayEmpty
                        sx={{ minWidth: 200 }}
                      >
                        <MenuItem value=""><em>Choose…</em></MenuItem>
                        <MenuItem value="1-3 months">1-3 months</MenuItem>
                        <MenuItem value="3-6 months">3-6 months</MenuItem>
                        <MenuItem value="6+ months">6+ months</MenuItem>
                        <MenuItem value="not sure">Not sure</MenuItem>
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
                        <Button type="submit" variant="contained" className="submit-btn" disabled={submitting}>
                          {submitting ? "Submitting…" : "Submit"}
                        </Button>
                      </Grid>
                      <Grid item xs={12}>
                        {statusMessage && (
                          <Typography variant="body2" sx={{ mt: 1, color: statusMessage.startsWith("Failed") ? 'error.main' : 'success.main' }}>
                            {statusMessage}
                          </Typography>
                        )}
                      </Grid>
                    </Grid>
                  </Box>
                </>
              ) : (
                <Box sx={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <Typography
                    sx={{
                      fontFamily: 'Poppins, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                      fontSize: { xs: '1.5rem', sm: '2rem', md: '2.25rem' },
                      fontWeight: 800,
                      lineHeight: 1.3,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                      color: '#111827',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {submittedMessageText}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
