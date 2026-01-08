// FILE: src/components/OtpInput.jsx

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useState, useEffect } from 'react';

export function OtpInput({ onOtpSubmit, onBack, userType }) {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleSubmit = async () => {
    if (otp.length !== 6) {
      setError('Please enter a complete 6-digit OTP');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await onOtpSubmit(otp);
    } catch (err) {
      setError('Invalid OTP. Please try again.');
      setOtp('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setCanResend(false);
    setResendTimer(30);
    setError('');
    setOtp('');
    console.log(`Resending OTP for ${userType}`);
  };

  const handleOtpChange = (value) => {
    setOtp(value);
    setError('');
    if (value.length === 6) {
      setTimeout(() => handleSubmit(), 100);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-1 h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle>Enter OTP</CardTitle>
            <CardDescription>
              A 6-digit verification code has been sent to your {userType === 'student' ? 'registered mobile number' : 'email address'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-6">
        <InputOTP maxLength={6} value={otp} onChange={handleOtpChange} disabled={isLoading}>
          <InputOTPGroup><InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} /></InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup><InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} /></InputOTPGroup>
        </InputOTP>
        {error && (<Alert variant="destructive" className="w-full"><AlertDescription>{error}</AlertDescription></Alert>)}
        <div className="flex flex-col w-full space-y-3">
          <Button onClick={handleSubmit} className="w-full" disabled={isLoading || otp.length !== 6}>
            {isLoading ? 'Verifying...' : 'Verify Account'}
          </Button>
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Didn't receive the code?</span>
            <Button variant="link" onClick={handleResendOtp} disabled={!canResend} className="p-0 h-auto font-normal text-sm">
              {canResend ? (<span className="flex items-center gap-1"><RefreshCw className="h-3 w-3" />Resend OTP</span>) : (`Resend in ${resendTimer}s`)}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}