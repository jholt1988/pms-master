import React, { useState, useEffect } from 'react';
import { Box, Button, Step, StepLabel, Stepper, Typography } from '@mui/material';

// Define the steps of the onboarding wizard
const steps = [
  'Welcome',
  'App Navigation',
  'Usage Overview',
  'Complete',
];

// Simple component for each step content
const StepContent: React.FC<{ step: number }> = ({ step }) => {
  switch (step) {
    case 0:
      return <Typography>Welcome to the app! This wizard will guide you through the main features.</Typography>;
    case 1:
      return <Typography>Use the side menu to navigate between sections. Try clicking on the Dashboard, Projects, and Settings.</Typography>;
    case 2:
      return <Typography>Here’s a quick usage overview: create a project, add members, and start a task. Explore the UI components for creating resources.</Typography>;
    case 3:
      return <Typography>All set! You can revisit this wizard later from the Help menu.</Typography>;
    default:
      return null;
  }
};

const LOCAL_STORAGE_KEY = 'onboardingWizardStep';

const OnboardingWizard: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);

  // Load persisted step from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const step = parseInt(saved, 10);
      if (!isNaN(step) && step >= 0 && step < steps.length) {
        setActiveStep(step);
      }
    }
  }, []);

  const handleNext = () => {
    const next = Math.min(activeStep + 1, steps.length - 1);
    setActiveStep(next);
    localStorage.setItem(LOCAL_STORAGE_KEY, String(next));
  };

  const handleBack = () => {
    const prev = Math.max(activeStep - 1, 0);
    setActiveStep(prev);
    localStorage.setItem(LOCAL_STORAGE_KEY, String(prev));
  };

  const handleReset = () => {
    setActiveStep(0);
    localStorage.setItem(LOCAL_STORAGE_KEY, '0');
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Box sx={{ mt: 2, mb: 2 }}>
        <StepContent step={activeStep} />
      </Box>
      <Box>
        {activeStep === steps.length - 1 ? (
          <Button variant="contained" onClick={handleReset}>
            Restart Wizard
          </Button>
        ) : (
          <>
            <Button disabled={activeStep === 0} onClick={handleBack} sx={{ mr: 1 }}>
              Back
            </Button>
            <Button variant="contained" onClick={handleNext}>
              {activeStep === steps.length - 2 ? 'Finish' : 'Next'}
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
};

export default OnboardingWizard;
