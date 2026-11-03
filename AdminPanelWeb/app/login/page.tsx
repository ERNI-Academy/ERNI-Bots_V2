"use client";

import { useState, FormEvent, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Body1,
  Button,
  Caption1,
  Field,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Spinner,
  Title1,
  tokens,
} from "@fluentui/react-components";
import { LockClosed20Regular, Person20Regular } from "@fluentui/react-icons";
import { loginApi } from "@/lib/auth";
import { ErniLogo } from "@/components/brand/ErniLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100dvh",
    backgroundColor: tokens.colorNeutralBackground2,
    "@media (min-width: 768px)": { flexDirection: "row" },
  },
  brand: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: tokens.spacingVerticalXXL,
    padding: tokens.spacingHorizontalXXXL,
    backgroundColor: "#033778", // ERNI Dark Blue (same in light and dark modes)
    "@media (min-width: 768px)": { width: "33%", minWidth: "320px" },
  },
  brandText: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalS },
  onBrand: { color: "#ffffff" },
  onBrandMuted: { color: "rgba(255,255,255,0.8)" },
  main: {
    position: "relative",
    flexGrow: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.spacingHorizontalXXXL,
  },
  themeSwitch: { position: "absolute", top: tokens.spacingVerticalL, right: tokens.spacingHorizontalL },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
    width: "100%",
    maxWidth: "440px",
    padding: tokens.spacingHorizontalXXL,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow8,
  },
  heading: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalXS },
  muted: { color: tokens.colorNeutralForeground3 },
});

function LoginContent() {
  const [username, setUsername] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const styles = useStyles();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isFormValid = username.trim().length > 0 && invitationCode.trim().length > 0;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional post-mount update: prefilling from the URL and localStorage after hydration avoids an SSR mismatch.
    setMounted(true);
    const codeFromUrl = searchParams.get("code");
    const storedCode = localStorage.getItem("invitationCode");
    const storedUsername = localStorage.getItem("username");
    if (codeFromUrl) {
      setInvitationCode(codeFromUrl);
    } else if (storedCode) {
      setInvitationCode(storedCode);
    }
    if (storedUsername) setUsername(storedUsername);
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginApi(username, invitationCode);
      localStorage.setItem("username", username);
      localStorage.setItem("invitationCode", invitationCode);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  const codeParam = searchParams.get("code");

  return (
    <div className={styles.root}>
      {/* Brand panel */}
      <aside className={styles.brand}>
        <ErniLogo surface="on-dark" height={40} />
        <div className={styles.brandText}>
          <Title1 as="h2" className={styles.onBrand}>SINGULARITY</Title1>
          <Caption1 className={styles.onBrandMuted}>PANEL DE ADMINISTRACIÓN</Caption1>
          <Body1 className={styles.onBrandMuted}>DE ERNI BOTS V2: EL PROTOCOLO FRAGMENTADO</Body1>
        </div>
        <Caption1 className={styles.onBrandMuted}>BETTERASK.ERNI</Caption1>
      </aside>

      {/* Form */}
      <main className={styles.main}>
        <div className={styles.themeSwitch}>
          <ThemeToggle />
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <header className={styles.heading}>
            <Title1 as="h1">Bienvenido</Title1>
            <Body1 className={styles.muted}>
              Introduce tus credenciales para acceder al panel de control y gestionar el CTF
            </Body1>
          </header>

          <Field label="Usuario">
            <Input
              size="large"
              contentBefore={<Person20Regular />}
              placeholder="Nombre de usuario"
              spellCheck={false}
              value={username}
              onChange={(_, d) => setUsername(d.value)}
            />
          </Field>

          <Field label="Código de Invitación">
            <Input
              size="large"
              contentBefore={<LockClosed20Regular />}
              placeholder="XXXX-XXXX-XXXX"
              spellCheck={false}
              value={invitationCode}
              onChange={(_, d) => setInvitationCode(d.value)}
              disabled={!!codeParam}
            />
          </Field>

          {error && (
            <MessageBar intent="error">
              <MessageBarBody>{error}</MessageBarBody>
            </MessageBar>
          )}

          <Button
            type="submit"
            appearance="primary"
            size="large"
            disabled={loading || !isFormValid}
            icon={loading ? <Spinner size="tiny" /> : undefined}
            iconPosition="before"
          >
            {loading ? "Autenticando..." : "Iniciar sesión"}
          </Button>
        </form>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
