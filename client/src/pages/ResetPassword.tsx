"use client";

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const passwordField = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères")
  .regex(/[A-Z]/, "Doit contenir au moins une majuscule")
  .regex(/[a-z]/, "Doit contenir au moins une minuscule")
  .regex(/[0-9]/, "Doit contenir au moins un chiffre");

const formSchema = z
  .object({
    password: passwordField,
    confirm: z.string().min(1, "Confirmation requise"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof formSchema>;

type CheckState = "checking" | "invalid" | "ready";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [checkState, setCheckState] = useState<CheckState>(() =>
    token ? "checking" : "invalid",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema as never),
    defaultValues: { password: "", confirm: "" },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  useEffect(() => {
    if (!token) {
      setCheckState("invalid");
      return;
    }

    let cancelled = false;
    setCheckState("checking");

    (async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/password-reset/validate?token=${encodeURIComponent(token)}`,
        );
        const data = (await res.json().catch(() => ({}))) as {
          valid?: boolean;
        };
        if (cancelled) return;
        setCheckState(data.valid ? "ready" : "invalid");
      } catch {
        if (!cancelled) setCheckState("invalid");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch(`${API_BASE}/api/password-reset/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: values.password,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
      };

      if (!res.ok) {
        setFormError(
          data.message ||
            (res.status === 429
              ? "Trop de tentatives. Réessayez plus tard."
              : "Une erreur est survenue."),
        );
        return;
      }

      setSuccessMessage(
        data.message || "Ton mot de passe a été mis à jour. Tu peux te connecter.",
      );
    } catch {
      setFormError("Une erreur inattendue est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Lien incomplet</CardTitle>
            <CardDescription>
              Ce lien ne contient pas de jeton de réinitialisation. Ouvre le
              lien reçu par e-mail ou demande un nouveau lien depuis la
              connexion.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/">Retour à l&apos;accueil</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (checkState === "checking") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Vérification du lien…</p>
      </main>
    );
  }

  if (checkState === "invalid") {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Lien invalide ou expiré</CardTitle>
            <CardDescription>
              Ce lien n&apos;est plus utilisable. Tu peux en demander un
              nouveau depuis la page de connexion (Mot de passe oublié).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/">Retour à l&apos;accueil</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (successMessage) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Mot de passe mis à jour</CardTitle>
            <CardDescription>{successMessage}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/">Retour à l&apos;accueil</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Nouveau mot de passe</CardTitle>
          <CardDescription>
            Choisis un mot de passe solide (mêmes règles qu&apos;à
            l&apos;inscription).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {formError && (
              <div className="text-sm text-destructive">{formError}</div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reset-password">Nouveau mot de passe</Label>
              <Input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reset-confirm">Confirmer le mot de passe</Label>
              <Input
                id="reset-confirm"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.confirm}
                {...register("confirm")}
              />
              {errors.confirm && (
                <p className="text-sm text-destructive">
                  {errors.confirm.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Enregistrer
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
