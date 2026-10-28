import React, { useState } from 'react';
import { publicApi } from '../../api/client';
import { useFeedback } from '../../context/FeedbackContext';
import { Banner, Button, Input } from '../../components/ui';
import AuthShell from './AuthShell';

export default function ForgotScreen({ navigation }) {
  const { toast } = useFeedback();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(null);
  const [devCode, setDevCode] = useState(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [busy, setBusy] = useState(false);

  const request = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErrors({ email: 'Ingresá un email válido' });
    setBusy(true);
    setServerError(null);
    try {
      const r = await publicApi('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setPending(r.pendingToken);
      setDevCode(r.devCode || null);
      setStep(2);
    } catch (e) {
      setErrors(e.fields || {});
      setServerError(e);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    setServerError(null);
    try {
      await publicApi('/auth/reset-password', { pendingToken: pending, code, password });
      toast('¡Listo! Ya podés ingresar con tu nueva contraseña');
      navigation.goBack();
    } catch (e) {
      setErrors(e.fields || {});
      setServerError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Recuperar contraseña"
      subtitle={step === 1 ? 'Te enviaremos un código a tu email.' : `Si ${email} tiene una cuenta, recibirás un código de 6 dígitos.`}
    >
      {serverError && <Banner message={serverError.message} />}
      {step === 1 ? (
        <>
          <Input label="Email" icon="email-outline" value={email} onChangeText={(v) => { setEmail(v); setErrors({}); }} error={errors.email} autoCapitalize="none" keyboardType="email-address" />
          <Button title="Enviar código" icon="send" onPress={request} loading={busy} />
        </>
      ) : (
        <>
          {devCode && <Banner kind="info" title="Modo desarrollo" message={`Código: ${devCode}`} action="Usar" onAction={() => setCode(devCode)} />}
          <Input label="Código" icon="numeric" value={code} onChangeText={setCode} error={errors.code} keyboardType="number-pad" maxLength={6} />
          <Input label="Nueva contraseña" icon="lock-outline" value={password} onChangeText={setPassword} error={errors.password} secure hint="Mín. 8 caracteres, con mayúscula, minúscula y número" />
          <Button title="Cambiar contraseña" icon="lock-reset" onPress={reset} loading={busy} />
        </>
      )}
    </AuthShell>
  );
}
