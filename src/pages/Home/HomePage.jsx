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
  FormHelperText,
} from "@mui/material";
import "./HomePage.css";


export default function HomePage() {
  const [selling, setSelling] = React.useState("");
  const [timeframe, setTimeframe] = React.useState("");
  const [buying, setBuying] = React.useState("");
  const [suburbValue, setSuburbValue] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState("");
  const [showSubmittedMessage, setShowSubmittedMessage] = React.useState(false);
  const [submittedMessageText, setSubmittedMessageText] = React.useState("");
  const [errors, setErrors] = React.useState({});

  const suburbOptions = [
    "Hornsby",
    "Asquith",
    "Waitara",
    "Hornsby Heights",
    "Mount Colah",
    "Mount Kuring-gai",
    "Berowra",
    "Berowra Heights",
    "Wahroonga",
    "Turramurra",
    "Pennant Hills",
    "Thornleigh",
    "Normanhurst",
  ];

  function validate(fields) {
    const errs = {};
    if (!fields.first_name) errs.first_name = "First name is required";
    if (!fields.last_name) errs.last_name = "Last name is required";
    if (!fields.email) errs.email = "Email is required";
    // Simple email format check
    if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) errs.email = "Invalid email";
    if (!fields.phone) errs.phone = "Phone number is required";
    if (fields.phone && !/^[+()\d\s-]{8,20}$/.test(fields.phone)) errs.phone = "Invalid phone number";
    if (!fields.suburb) errs.suburb = "Suburb is required";
    if (!fields.timeframe) errs.timeframe = "Timeframe is required";
    if (!fields.interested) errs.interested = "Please select an option";
    if (!fields.interested_buying) errs.interested_buying = "Please select an option";
    return errs;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage("");
    setErrors({});
    setSubmitting(true);
    try {
      const formEl = e.target;
      const formData = new FormData(formEl);
      const payload = {
        first_name: (formData.get("first_name") || "").trim(),
        last_name: (formData.get("last_name") || "").trim(),
        email: (formData.get("email") || "").toLowerCase(),
        phone: (formData.get("phone") || "").trim(),
  suburb: suburbValue || formData.get("suburb") || "",
        timeframe: formData.get("timeframe") || "",
        interested: formData.get("interested") || "",
        interested_buying: formData.get("interested_buying") || "",
      };

      const vErrors = validate(payload);
      if (Object.keys(vErrors).length > 0) {
        setErrors(vErrors);
        setSubmitting(false);
        return;
      }

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
  setSelling("");
  setTimeframe("");
  setBuying("");
  setSuburbValue("");

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
                  <Typography variant="h5" className="lead-title" gutterBottom>
                    Thank you for your interest in Stone Real Estate.
                  </Typography>

                  <Typography variant="body1" sx={{ mb: 3, color: "#4b5563" }}>
                    Please fill out the form, we will get in touch with you soon.
                  </Typography>

                  <Box component="form" onSubmit={handleSubmit}>
                    <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      name="first_name"
                      label="First Name"
                      fullWidth
                      error={!!errors.first_name}
                      helperText={errors.first_name}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      name="last_name"
                      label="Last Name"
                      fullWidth
                      error={!!errors.last_name}
                      helperText={errors.last_name}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      name="email"
                      label="Email Address"
                      type="email"
                      fullWidth
                      error={!!errors.email}
                      helperText={errors.email}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      name="phone"
                      label="Phone Number"
                      fullWidth
                      error={!!errors.phone}
                      helperText={errors.phone}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth error={!!errors.suburb}>
                      <FormLabel>Suburb</FormLabel>
                      <Select
                        name="suburb"
                        value={suburbValue}
                        onChange={(e) => setSuburbValue(e.target.value)}
                        displayEmpty
                        sx={{ minWidth: 200 }}
                        renderValue={(val) => val || "Select suburb"}
                      >
                        <MenuItem value="">
                          <em>Select suburb</em>
                        </MenuItem>
                        {suburbOptions.map((s) => (
                          <MenuItem key={s} value={s}>{s}</MenuItem>
                        ))}
                      </Select>
                      {errors.suburb && <FormHelperText>{errors.suburb}</FormHelperText>}
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
                    <FormControl fullWidth error={!!errors.interested}>
                      <FormLabel>Are you interested in selling a property?</FormLabel>
                      <RadioGroup
                        row
                        name="interested"
                        value={selling}
                        onChange={(e) => { setSelling(e.target.value); setErrors(prev => ({ ...prev, interested: undefined })); }}
                      >
                        <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                        <FormControlLabel value="no" control={<Radio />} label="No" />
                      </RadioGroup>
                      {errors.interested && <FormHelperText>{errors.interested}</FormHelperText>}
                    </FormControl>
                    <FormControl fullWidth sx={{ mt: 2 }} error={!!errors.interested_buying}>
                      <FormLabel>Are you interested in buying a property?</FormLabel>
                      <RadioGroup
                        row
                        name="interested_buying"
                        value={buying}
                        onChange={(e) => { setBuying(e.target.value); setErrors(prev => ({ ...prev, interested_buying: undefined })); }}
                      >
                        <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                        <FormControlLabel value="no" control={<Radio />} label="No" />
                      </RadioGroup>
                      {errors.interested_buying && <FormHelperText>{errors.interested_buying}</FormHelperText>}
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth error={!!errors.timeframe}>
                      <FormLabel>What is your expected timeframe for selling?</FormLabel>
                      <Select
                        name="timeframe"
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value)}
                        displayEmpty
                        sx={{ minWidth: 200 }}
                        renderValue={(val) => val || "Choose timeframe"}
                      >
                        <MenuItem value=""><em>Choose timeframe</em></MenuItem>
                        <MenuItem value="1-3 months">1-3 months</MenuItem>
                        <MenuItem value="3-6 months">3-6 months</MenuItem>
                        <MenuItem value="6+ months">6+ months</MenuItem>
                        <MenuItem value="not sure">Not sure</MenuItem>
                      </Select>
                      {errors.timeframe && <FormHelperText>{errors.timeframe}</FormHelperText>}
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
